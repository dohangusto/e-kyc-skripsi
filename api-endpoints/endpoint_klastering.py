from fastapi import FastAPI, UploadFile, File, HTTPException
import pandas as pd
import numpy as np
import io
from kmodes.kprototypes import KPrototypes
from preprocessing import preprocessing_klaster


app = FastAPI()

# state untuk menyimpan model dan berbagai hasil antara
model_state = {
    "df_with_labels": None,
    "df_ranked": None,   # hasil ranking (dipakai seleksi kuota)
    "df_ranked_pendukung": None,  # hasil ranking untuk bansos pendukung
}


@app.get("/")
def read_root():
    return {"message": "API OK"}


@app.get("/ringkasan")
def ringkasan_hasil():
    df = model_state.get("df_ranked")
    if df is None or df.empty:
        raise HTTPException(
            status_code=404,
            detail="Data belum tersedia. Jalankan /klastering terlebih dahulu.",
        )

    total = int(len(df))
    non_bansos = int((df["bansos_utama"] == "Non-Bansos").sum()) if "bansos_utama" in df.columns else 0
    prioritas_bansos = total - non_bansos

    score_min = float(df["score"].min()) if "score" in df.columns else None
    score_max = float(df["score"].max()) if "score" in df.columns else None

    distribusi = (
        df["bansos_utama"].value_counts().to_dict()
        if "bansos_utama" in df.columns
        else {}
    )

    return {
        "data_diproses": total,
        "prioritas_bansos": prioritas_bansos,
        "non_bansos": non_bansos,
        "rentang_skor": [score_min, score_max],
        "distribusi_bansos_utama": distribusi,
    }


@app.get("/statistik/klaster/jumlah")
def statistik_jumlah_klaster():
    df = model_state.get("df_with_labels")
    if df is None or df.empty or "klaster" not in df.columns:
        raise HTTPException(
            status_code=404,
            detail="Data klaster belum tersedia. Jalankan /klastering terlebih dahulu.",
        )
    return {"jumlah_data_per_klaster": df["klaster"].value_counts().to_dict()}


@app.get("/statistik/bansos-utama")
def statistik_bansos_utama():
    df = model_state.get("df_ranked")
    if df is None or df.empty or "bansos_utama" not in df.columns:
        raise HTTPException(
            status_code=404,
            detail="Data bansos belum tersedia. Jalankan /klastering terlebih dahulu.",
        )
    return {"distribusi_bansos_utama": df["bansos_utama"].value_counts().to_dict()}


@app.get("/bansos")
def filter_bansos(jenis: str | None = None, include_pendukung: bool = False):
    df_utama = model_state.get("df_ranked")
    if df_utama is None or df_utama.empty:
        raise HTTPException(
            status_code=404,
            detail="Data ranking belum tersedia. Jalankan /klastering terlebih dahulu.",
        )

    jenis = (jenis or "").strip().upper()
    valid_jenis = {"PKH", "PBI", "BPNT", "NON-BANSOS", ""}
    if jenis not in valid_jenis:
        raise HTTPException(
            status_code=400,
            detail="Parameter 'jenis' harus PKH, PBI, BPNT, Non-Bansos, atau kosong.",
        )

    parts = []
    if not jenis:
        utama_rows = df_utama.copy()
    else:
        target = "Non-Bansos" if jenis == "NON-BANSOS" else jenis
        utama_rows = df_utama[df_utama["bansos_utama"] == target].copy()

    if not utama_rows.empty:
        utama_rows["sumber"] = "utama"
        parts.append(utama_rows)

    if include_pendukung:
        df_pendukung = model_state.get("df_ranked_pendukung")
        if df_pendukung is not None and not df_pendukung.empty and jenis:
            pend_target = "Non-Bansos" if jenis == "NON-BANSOS" else jenis
            pend_rows = df_pendukung[df_pendukung["bansos_pendukung_kategori"] == pend_target].copy()
            if not pend_rows.empty:
                pend_rows["sumber"] = "pendukung"
                parts.append(pend_rows)

    if not parts:
        return {"jenis": jenis or "SEMUA", "jumlah": 0, "data": []}

    df_out = pd.concat(parts, ignore_index=True)
    df_out["sumber_rank"] = df_out["sumber"].map({"utama": 0, "pendukung": 1}).fillna(2)
    sort_cols = ["sumber_rank", "score"]
    sort_asc = [True, False]
    if "priority" in df_out.columns:
        sort_cols.append("priority")
        sort_asc.append(True)
    df_out = df_out.sort_values(sort_cols, ascending=sort_asc).reset_index(drop=True)
    df_out = df_out.drop(columns=["sumber_rank"])
    df_out["priority_global"] = range(1, len(df_out) + 1)
    df_out = df_out.replace({np.nan: None})

    id_cols = [c for c in ["NIK", "Nama", "Tahun Lahir", "Status"] if c in df_out.columns]
    output_cols = id_cols + [
        c for c in [
            "score",
            "priority",
            "priority_global",
            "bansos_utama",
            "bansos_pendukung",
            "sumber",
        ]
        if c in df_out.columns
    ]

    return {
        "jenis": jenis or "SEMUA",
        "jumlah": int(len(df_out)),
        "data": df_out[output_cols].to_dict(orient="records"),
    }

def add_general_criteria(df: pd.DataFrame) -> pd.DataFrame:
    """
    Membentuk 5 kriteria umum:
      K1: status_pekerjaan (skor kerentanan)
      K2: tingkat_penghasilan (skor kerentanan)
      K3: beban_tanggungan_pendidikan (jumlah tanggungan + anak sekolah)
      K4: lansia_flag (ada lansia atau tidak)
      K5: disabilitas_flag (ada disabilitas/penyakit kronis atau tidak)
    """

    df = df.copy()

    pekerjaan_rentan_map = {
        8: 3,  # tidak bekerja  → sangat rentan
        1: 3,  # usaha + buruh tidak tetap / tidak dibayar
        7: 3,  # pekerja keluarga / tidak dibayar
        5: 2,  # pekerja bebas pertanian
        6: 2,  # pekerja bebas non-pertanian
        0: 1,  # usaha + buruh tetap / dibayar
        2: 1,  # berusaha sendiri
        3: 1,  # buruh/karyawan/pegawai swasta
        4: 0,  # PNS/BUMN/BUMD → paling stabil
    }

    df["k1_status_pekerjaan"] = (
        df["pekerjaan"]
        .map(pekerjaan_rentan_map)
        .fillna(0)
        .astype(int)
    )

    penghasilan_rentan_map = {
        3: 3,  # <500k   → paling rentan
        2: 2,  # 500k–1jt
        0: 1,  # 1–2jt
        1: 0,  # 2–3jt   → relatif paling aman di dataset ini
    }

    df["k2_tingkat_penghasilan"] = (
        df["penghasilan"]
        .map(penghasilan_rentan_map)
        .fillna(0)
        .astype(int)
    )


    df["k3_beban_tanggungan_pendidikan"] = (
        df["jumlah_tanggungan"].fillna(0).astype(int)
        + df["jumlah_anak_sekolah"].fillna(0).astype(int)
    )


    df["k4_lansia_flag"] = (df["lansia_(>60_tahun)"] > 0).astype(int)


    df["k5_disabilitas_flag"] = (df["disabilitas/penyakit_kronis"] > 0).astype(int)

    return df


# Konfigurasi default untuk PROMETHEE berbasis 5 kriteria
DEFAULT_FITUR = [
    "k1_status_pekerjaan",              # Status pekerjaan kepala keluarga (semakin rentan → semakin besar)
    "k2_tingkat_penghasilan",          # Tingkat penghasilan (semakin rendah → semakin besar)
    "k3_beban_tanggungan_pendidikan",  # Jumlah tanggungan + anak sekolah
    "k4_lansia_flag",                  # Ada lansia di rumah tangga
    "k5_disabilitas_flag",             # Ada disabilitas / penyakit kronis
]

# makin besar nilainya, makin rentan → preferensi "max"
DEFAULT_PREF = ["max", "max", "max", "max", "max"]

# Bobot general (total = 1.0):
DEFAULT_BOBOT = [0.25, 0.25, 0.25, 0.15, 0.10]


def apply_bansos_rules(row: pd.Series) -> pd.Series:

    umur = int(row.get("umur", 0) or 0)
    anak = int(row.get("jumlah_anak_sekolah", 0) or 0)
    tanggungan = int(row.get("jumlah_tanggungan", 0) or 0)

    balita_val = row.get("balita/anak_usia_dini", 0) or 0
    disabilitas_val = row.get("disabilitas/penyakit_kronis", 0) or 0

    penghasilan_raw = row.get("penghasilan", None)
    pekerjaan_raw   = row.get("pekerjaan", None)

    penghasilan_kode = int(penghasilan_raw) if penghasilan_raw is not None and not pd.isna(penghasilan_raw) else None
    pekerjaan_kode   = int(pekerjaan_raw)   if pekerjaan_raw   is not None and not pd.isna(pekerjaan_raw)   else None

    # -------------------------------------------
    # Mapping sesuai encoding kamu
    # -------------------------------------------

    # 8 = tidak bekerja
    tidak_bekerja = (pekerjaan_kode == 8)

    # Pekerjaan tidak tetap / rentan:
    # 1 = usaha + buruh tidak tetap/tidak dibayar
    # 5 = pekerja bebas pertanian
    # 6 = pekerja bebas non-pertanian
    # 7 = pekerja keluarga/tidak dibayar
    tidak_punya_pekerjaan_tetap = pekerjaan_kode in {1, 5, 6, 7}

    balita_flag             = balita_val > 0
    disabilitas_flag        = disabilitas_val > 0
    lansia_flag             = umur >= 60

    # -------------------------------------------
    # Definisi "miskin ekstrem" vs "hampir miskin"
    # -------------------------------------------
    sangat_rendah = penghasilan_kode == 3       # < 500k
    rendah        = penghasilan_kode == 2       # 500k–1jt
    menengah_bwh  = penghasilan_kode == 0       # 1–2jt

    penghasilan_minimum = penghasilan_kode in {2, 3}    # ≤1jt
    penghasilan_rendah  = penghasilan_kode in {0, 2, 3} # ≤2jt

    tanggungan_berat = tanggungan >= 3
    beban_pendidikan_tinggi = anak >= 2
    balita_flag = balita_val > 0

    # miskin ekstrem: income kecil + beban keluarga berat / disabilitas / lansia
    miskin_ekstrem = penghasilan_minimum and (
        tanggungan_berat
        or (beban_pendidikan_tinggi and tanggungan >= 3)
        or (balita_flag and tanggungan >= 3)
        or disabilitas_flag
        or lansia_flag
    )

    hampir_miskin = penghasilan_rendah and not miskin_ekstrem

    # layak PBI dari sisi kesehatan
    pbi_relevan = disabilitas_flag and (sangat_rendah or rendah)

    eligible_PKH = miskin_ekstrem and (tidak_bekerja or tidak_punya_pekerjaan_tetap)
    eligible_PBI = bool(pbi_relevan)
    eligible_BPNT = hampir_miskin and (tidak_bekerja or tidak_punya_pekerjaan_tetap or penghasilan_minimum)

    if (eligible_PKH or eligible_PBI) and penghasilan_rendah and (
        tidak_bekerja or tidak_punya_pekerjaan_tetap or penghasilan_minimum
    ):
        eligible_BPNT = True

    bansos_list = []
    if eligible_PKH:
        bansos_list.append("PKH")
    if eligible_PBI:
        bansos_list.append("PBI")
    if eligible_BPNT:
        bansos_list.append("BPNT")
    if not bansos_list:
        bansos_list = ["Non-Bansos"]

    if "PKH" in bansos_list:
        bansos_utama = "PKH"
    elif "PBI" in bansos_list:
        bansos_utama = "PBI"
    elif "BPNT" in bansos_list:
        bansos_utama = "BPNT"
    else:
        bansos_utama = "Non-Bansos"

    bansos_pendukung = [b for b in bansos_list if b != bansos_utama] or None

    return pd.Series({
        "bansos_utama": bansos_utama,
        "bansos_pendukung": bansos_pendukung,
        "bansos_list": bansos_list,
        "layak_PBI": eligible_PBI,
    })



@app.post("/klastering")
async def klastering(file: UploadFile = File(...)):
    df = pd.read_excel(io.BytesIO(await file.read()))

    # Simpan kolom identitas terlebih dahulu (kalau tidak ada Nama, buat dummy)
    id_cols = [c for c in ["NIK", "Nama", "Tahun Lahir", "Status"] if c in df.columns]
    if "Nama" not in id_cols:
        df_id = pd.DataFrame({"Nama": range(len(df))})
        id_cols = ["Nama"]
    else:
        df_id = df[id_cols].copy()

    # Preprocessing (hasilnya hanya fitur, tanpa Nama)
    df_selected, X_matrix, cat_idx, _, _, _ = preprocessing_klaster(df)

    # Simpan index baris yang dipakai setelah preprocessing
    original_idx = df_selected.index

    # Klastering dengan K-Prototypes
    model = KPrototypes(n_clusters=3, init='Cao', n_init=5, verbose=1, random_state=42)
    clusters = model.fit_predict(X_matrix, categorical=cat_idx)
    df_selected["klaster"] = clusters

    # Reset index supaya rapi
    df_selected = df_selected.reset_index(drop=True)

    df_selected = add_general_criteria(df_selected)

    # Tambahkan kembali kolom identitas sesuai baris yang benar
    df_id = df_id.loc[original_idx].reset_index(drop=True)
    for col in id_cols:
        df_selected[col] = df_id[col]

    # Rule-based: tentukan jenis bansos
    df_rules = df_selected.apply(apply_bansos_rules, axis=1)
    df_selected = pd.concat([df_selected, df_rules], axis=1)

    # Jalankan PROMETHEE untuk setiap bansos utama & bansos pendukung
    df_ranked_utama = run_promethee_on_bansos_utama(df_selected, bansos_col="bansos_utama")
    df_ranked_pendukung = run_promethee_on_bansos_pendukung(df_selected, bansos_pendukung_col="bansos_pendukung")

    # Simpan hasil ranking ke state agar bisa dipakai endpoint lain
    model_state["df_ranked"] = df_ranked_utama.copy()
    model_state["df_ranked_pendukung"] = df_ranked_pendukung.copy()

   
    # Simpan hasil untuk endpoint lain
    model_state["df_with_labels"] = df_selected.copy()
    model_state["df_ranked"] = df_ranked_utama.copy()
    

    # Output ringkas: identitas + skor + ranking + bansos
    output_cols = [c for c in id_cols if c in df_ranked_utama.columns]
    output_cols += [c for c in ["score", "priority", "bansos_utama", "bansos_pendukung"] if c in df_ranked_utama.columns]
    data_output = df_ranked_utama[output_cols].to_dict(orient="records")

    return {
        "message": "Klastering selesai",
        "data": data_output,
    }



def _promethee_preference(d: float, pref_type: str = "usual", q: float = 0.0, p: float = 1.0) -> float:
    """
    Fungsi preferensi PROMETHEE (skala 0..1) untuk selisih d = f(a) - f(b) setelah arah kriteria diseragamkan.
    - usual  : 0 jika d <= 0, 1 jika d > 0
    - u-shape: 0 jika d <= q, 1 jika d > q
    - v-shape: 0 jika d <= 0, d/p jika 0 < d < p, 1 jika d >= p
    - level  : 0 jika d <= q, 0.5 jika q < d <= p, 1 jika d > p
    - linear : 0 jika d <= q, (d-q)/(p-q) jika q < d < p, 1 jika d >= p
    """
    t = (pref_type or "usual").lower()

    if t == "usual":
        return 1.0 if d > 0 else 0.0

    if t in {"u-shape", "ushape"}:
        return 1.0 if d > q else 0.0

    if t in {"v-shape", "vshape"}:
        if d <= 0:
            return 0.0
        if d >= p:
            return 1.0
        return float(d / p) if p != 0 else 1.0

    if t == "level":
        if d <= q:
            return 0.0
        if d <= p:
            return 0.5
        return 1.0

    if t == "linear":
        if d <= q:
            return 0.0
        if d >= p:
            return 1.0
        return float((d - q) / (p - q)) if (p - q) != 0 else 1.0

    # fallback (aman)
    return 1.0 if d > 0 else 0.0


def promethee_ii(
    df: pd.DataFrame,
    criteria: list[str],
    weights: list[float],
    directions: list[str],
    preference_types: list[str] | None = None,
    q: list[float] | None = None,
    p: list[float] | None = None,
) -> pd.DataFrame:
    """
    Menghitung PROMETHEE II (leaving flow, entering flow, net flow) untuk sekumpulan alternatif.
    Output akan menambahkan kolom:
      - phi_plus, phi_minus, phi_net, rank_promethee
    Catatan:
      - directions: "max" (benefit) atau "min" (cost)
      - Data kriteria sebaiknya sudah dalam skala sebanding (mis. 0..1 atau skor kerentanan).
    """
    out = df.copy()

    if preference_types is None:
        preference_types = ["usual"] * len(criteria)
    if q is None:
        q = [0.0] * len(criteria)
    if p is None:
        # default p = 1 agar aman jika datanya sudah diskalakan 0..1
        p = [1.0] * len(criteria)

    # validasi ringan
    if not (len(criteria) == len(weights) == len(directions) == len(preference_types) == len(q) == len(p)):
        raise ValueError("Panjang criteria, weights, directions, preference_types, q, dan p harus sama.")

    # normalisasi bobot (agar sum = 1)
    w_sum = float(sum(weights))
    weights = [float(w) / w_sum if w_sum != 0 else 1.0 / len(weights) for w in weights]

    # ambil matriks nilai (n x m)
    V = out[criteria].astype(float).to_numpy()
    n, m = V.shape

    if n <= 1:
        out["phi_plus"] = 0.0
        out["phi_minus"] = 0.0
        out["phi_net"] = 0.0
        out["rank_promethee"] = 1
        return out

    # seragamkan arah: untuk "min" (cost), ubah menjadi benefit dengan mengalikan -1
    sign = []
    for d in directions:
        d = (d or "max").lower()
        sign.append(1.0 if d == "max" else -1.0)
    sign = np.array(sign, dtype=float)

    V_dir = V * sign  # sekarang semua "semakin besar semakin baik"

    # hitung indeks preferensi agregat π(a,b)
    pi = np.zeros((n, n), dtype=float)

    for i in range(n):
        for k in range(n):
            if i == k:
                continue

            pref_sum = 0.0
            for j in range(m):
                d_ik = V_dir[i, j] - V_dir[k, j]
                P = _promethee_preference(d_ik, preference_types[j], q[j], p[j])
                pref_sum += weights[j] * P

            pi[i, k] = pref_sum

    # leaving, entering, net flow
    denom = float(n - 1)
    phi_plus = pi.sum(axis=1) / denom
    phi_minus = pi.sum(axis=0) / denom
    phi_net = phi_plus - phi_minus

    out["phi_plus"] = phi_plus
    out["phi_minus"] = phi_minus
    out["phi_net"] = phi_net

    # ranking: semakin besar phi_net semakin tinggi prioritas
    out["rank_promethee"] = out["phi_net"].rank(method="dense", ascending=False).astype(int)

    return out


def hitung_ranking_umum(df_cluster: pd.DataFrame) -> pd.DataFrame:
    df_cluster = df_cluster.copy()

    missing = [c for c in DEFAULT_FITUR if c not in df_cluster.columns]
    if missing:
        raise ValueError(f"Kolom kriteria belum lengkap: {missing}")

    ranked = promethee_ii(
        df_cluster,
        criteria=DEFAULT_FITUR,
        weights=DEFAULT_BOBOT,
        directions=DEFAULT_PREF,
        preference_types=["usual"] * len(DEFAULT_FITUR),
        q=[0.0] * len(DEFAULT_FITUR),
        p=[1.0] * len(DEFAULT_FITUR),
    )

    df_cluster["phi_plus"] = ranked["phi_plus"]
    df_cluster["phi_minus"] = ranked["phi_minus"]

    df_cluster["score"] = ranked["phi_net"]
    df_cluster["rank_promethee"] = ranked["rank_promethee"]  # simpan ranking PROMETHEE apa adanya (boleh tie)

    return df_cluster



def run_promethee_on_bansos_utama(
    df_labeled: pd.DataFrame,
    bansos_col: str = "bansos_utama",
) -> pd.DataFrame:
    if bansos_col not in df_labeled.columns:
        raise ValueError(f"Kolom '{bansos_col}' tidak ditemukan.")

    missing = [c for c in DEFAULT_FITUR if c not in df_labeled.columns]
    if missing:
        raise ValueError(f"Kolom kriteria PROMETHEE belum lengkap: {missing}")

    out = []
    for b, g in df_labeled.groupby(bansos_col, dropna=False):
        ranked_g = hitung_ranking_umum(g)

        if "score" not in ranked_g.columns:
            raise ValueError("Output hitung_ranking_umum() harus memiliki kolom 'score' (phi_net).")

        tie_breakers = [col for col in DEFAULT_FITUR if col in ranked_g.columns]

        ranked_g = ranked_g.sort_values(
            by=["score"] + tie_breakers,
            ascending=[False] + [False] * len(tie_breakers),
            kind="mergesort",
        ).reset_index(drop=True)

        ranked_g["priority"] = range(1, len(ranked_g) + 1)
        out.append(ranked_g)

    if not out:
        empty_cols = df_labeled.columns.tolist() + [
            "phi_plus",
            "phi_minus",
            "phi_net",
            "rank_promethee",
            "score",
            "priority",
        ]
        return pd.DataFrame(columns=empty_cols)

    out_df = pd.concat(out, ignore_index=True)
    out_df = out_df.sort_values([bansos_col, "priority"], ascending=[True, True]).reset_index(drop=True)
    return out_df


def run_promethee_on_bansos_pendukung(
    df_labeled: pd.DataFrame,
    bansos_pendukung_col: str = "bansos_pendukung",
) -> pd.DataFrame:
    if bansos_pendukung_col not in df_labeled.columns:
        raise ValueError(f"Kolom '{bansos_pendukung_col}' tidak ditemukan.")

    missing = [c for c in DEFAULT_FITUR if c not in df_labeled.columns]
    if missing:
        raise ValueError(f"Kolom kriteria PROMETHEE belum lengkap: {missing}")

    all_bansos = set()
    for items in df_labeled[bansos_pendukung_col]:
        if isinstance(items, list):
            all_bansos.update(items)
    all_bansos = sorted(all_bansos)

    out = []
    for b in all_bansos:
        g = df_labeled[df_labeled[bansos_pendukung_col].apply(lambda x: isinstance(x, list) and b in x)]
        if g.empty:
            continue
        ranked_g = hitung_ranking_umum(g)

        if "score" not in ranked_g.columns:
            raise ValueError("Output hitung_ranking_umum() harus memiliki kolom 'score' (phi_net).")

        tie_breakers = [col for col in DEFAULT_FITUR if col in ranked_g.columns]

        ranked_g = ranked_g.sort_values(
            by=["score"] + tie_breakers,
            ascending=[False] + [False] * len(tie_breakers),
            kind="mergesort",
        ).reset_index(drop=True)

        ranked_g["bansos_pendukung_kategori"] = b
        ranked_g["priority"] = range(1, len(ranked_g) + 1)
        out.append(ranked_g)

    if not out:
        empty_cols = df_labeled.columns.tolist() + [
            "phi_plus",
            "phi_minus",
            "phi_net",
            "rank_promethee",
            "score",
            "priority",
            "bansos_pendukung_kategori",
        ]
        return pd.DataFrame(columns=empty_cols)

    out_df = pd.concat(out, ignore_index=True)
    out_df = out_df.sort_values(["bansos_pendukung_kategori", "priority"], ascending=[True, True]).reset_index(drop=True)
    return out_df

