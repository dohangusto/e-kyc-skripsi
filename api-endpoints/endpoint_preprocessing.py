import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder



# =========================
# Fungsi 0: Cleaning dasar
# =========================
def basic_cleaning(
    df: pd.DataFrame,
    drop_cols=None
) -> pd.DataFrame:
    """
    Cleaning dasar:
    - Drop kolom identitas (misal: Nama, Tahun Lahir, ID_Keluarga)
    - Standardisasi nama kolom (lowercase, strip spasi, ganti spasi jadi underscore)
    - Hapus duplikat
    - Tangani nilai hilang:
        * numerik -> median
        * kategorikal -> modus
    """

    if drop_cols is None:
        drop_cols = ['NIK', 'Nama', 'Tahun Lahir', 'Status']

    df_clean = df.copy()

    # Drop kolom yang tidak dipakai jika ada
    df_clean = df_clean.drop(
        columns=[col for col in drop_cols if col in df_clean.columns],
        errors="ignore"
    )

    # Standardisasi nama kolom
    df_clean.columns = (
        df_clean.columns
        .str.strip()
        .str.lower()
        .str.replace(' ', '_', regex=False)
    )


    # Tangani nilai hilang
    num_cols = df_clean.select_dtypes(include=[np.number]).columns.tolist()
    cat_cols = df_clean.select_dtypes(exclude=[np.number]).columns.tolist()

    for col in num_cols:
        if df_clean[col].isna().any():
            df_clean[col] = df_clean[col].fillna(df_clean[col].median())

    for col in cat_cols:
        if df_clean[col].isna().any():
            df_clean[col] = df_clean[col].fillna(df_clean[col].mode().iloc[0])

    return df_clean


# ==============================================
# Fungsi 1: Filter fitur berdasarkan variasi
# ==============================================
def filter_variatif_fitur(df: pd.DataFrame, threshold: float = 0.85):
    fitur_kategorikal_valid = []
    fitur_numerik_valid = []

    for col in df.columns:
        if df[col].dtype == 'object' or df[col].dtype.name == 'category':
            top_freq = df[col].value_counts(normalize=True, dropna=False).max()
            if top_freq < threshold:
                fitur_kategorikal_valid.append(col)
        else:
            if df[col].nunique(dropna=False) > 1:
                fitur_numerik_valid.append(col)

    return fitur_kategorikal_valid, fitur_numerik_valid


# ==============================================
# Fungsi 2: Preprocessing untuk klastering
# ==============================================
def preprocessing_klaster(df: pd.DataFrame, threshold: float = 0.85):
    # 1) Cleaning dasar (optional, bisa dimatikan kalau belum perlu)
    #    Di sini "Nama" memang di-drop, karena hanya ID.
    df_clean = basic_cleaning(df, drop_cols=['NIK', 'Nama', 'Tahun Lahir', 'Status'])

    # 2) Hanya pakai kolom fitur (tanpa Nama)
    #    Kalau basic_cleaning sudah menghapus Nama, baris berikut aman-aman saja:
    df_features = df_clean.copy()

    # 3) Pilih fitur variatif (kategori & numerik)
    fitur_kat, fitur_num = filter_variatif_fitur(df_features, threshold)
    fitur_dipakai = fitur_num + fitur_kat

    # 4) Ambil data hanya pada fitur yang dipakai dan drop baris yang masih ada NaN
    df_selected = df_features[fitur_dipakai].dropna().copy()

    # 5) Label Encoding untuk fitur kategorikal
    label_encoders = {}
    for col in fitur_kat:
        le = LabelEncoder()
        df_selected[col] = le.fit_transform(df_selected[col].astype(str))
        label_encoders[col] = le

    # 6) Siapkan matrix untuk K-Prototypes
    X_matrix = df_selected.to_numpy()
    cat_idx = [df_selected.columns.get_loc(col) for col in fitur_kat]

    return df_selected, X_matrix, cat_idx, fitur_num, fitur_kat, label_encoders