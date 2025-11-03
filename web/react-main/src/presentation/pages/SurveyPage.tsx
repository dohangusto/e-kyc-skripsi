import { useEffect, useMemo, useState, type ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import type { Applicant } from "@domain/types";
import type { SurveyAnswers, SurveyStatus } from "@domain/entities/account";

type StepKey = "A_IDENTITAS" | "B_KELUARGA" | "C_PEKERJAAN" | "D_ASET" | "E_KESEHATAN";

const ALL_STEPS: StepKey[] = ["A_IDENTITAS", "B_KELUARGA", "C_PEKERJAAN", "D_ASET", "E_KESEHATAN"];

const STEP_LABELS: Record<StepKey, string> = {
  A_IDENTITAS: "Identitas Diri",
  B_KELUARGA: "Kondisi Keluarga",
  C_PEKERJAAN: "Pendidikan & Pekerjaan",
  D_ASET: "Tempat Tinggal & Aset",
  E_KESEHATAN: "Kesehatan & Kebiasaan",
};

const defaultAnswers: SurveyAnswers = {
  partB: {
    householdMembers: "",
    schoolChildren: "",
    toddlers: "",
    elderly: "",
    disability: "",
  },
  partC: {
    education: "",
    occupation: "",
    income: "",
    extraIncome: "",
  },
  partD: {
    homeOwnership: "",
    floorType: "",
    wallType: "",
    roofType: "",
    vehicle: "",
    savings: "",
    lighting: "",
    waterSource: "",
    cookingFuel: "",
    toilet: "",
    wasteDisposal: "",
    sanitation: "",
  },
  partE: {
    healthCheck: "",
  },
};

function createDefaultAnswers(): SurveyAnswers {
  return JSON.parse(JSON.stringify(defaultAnswers));
}

type SurveyPageProps = {
  applicant: Applicant;
  existingAnswers?: SurveyAnswers;
  mode?: "fill" | "review";
  status?: SurveyStatus;
  onCancel: (draft?: SurveyAnswers) => void;
  onSaveDraft?: (answers: SurveyAnswers) => void;
  onSubmit: (answers: SurveyAnswers, status?: SurveyStatus) => void;
};

export default function SurveyPage({
  applicant,
  existingAnswers,
  mode = "fill",
  status = "antrean",
  onCancel,
  onSaveDraft,
  onSubmit,
}: SurveyPageProps) {
  const isReview = mode === "review";
  const [step, setStep] = useState<StepKey>(ALL_STEPS[0]);
  const [answers, setAnswers] = useState<SurveyAnswers>(() =>
    existingAnswers
      ? {
          partB: { ...defaultAnswers.partB, ...existingAnswers.partB },
          partC: { ...defaultAnswers.partC, ...existingAnswers.partC },
          partD: { ...defaultAnswers.partD, ...existingAnswers.partD },
          partE: { ...defaultAnswers.partE, ...existingAnswers.partE },
        }
      : createDefaultAnswers(),
  );
  const [submitted, setSubmitted] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  const stepIndex = ALL_STEPS.indexOf(step);
  const progress = useMemo(() => Math.round(((stepIndex + 1) / ALL_STEPS.length) * 100), [stepIndex]);

  useEffect(() => {
    if (!submitted || isReview) return;
    const payload = JSON.parse(JSON.stringify(answers)) as SurveyAnswers;
    const timer = window.setTimeout(() => onSubmit(payload, "antrean"), 1500);
    return () => window.clearTimeout(timer);
  }, [submitted, answers, onSubmit, isReview]);

  if (isReview) {
    return <SurveySummary applicant={applicant} answers={answers} status={status} onClose={() => onCancel()} />;
  }

  const disableNav = submitted;

  const snapshot = () => JSON.parse(JSON.stringify(answers)) as SurveyAnswers;

  function next() {
    if (stepIndex < ALL_STEPS.length - 1) {
      setStep(ALL_STEPS[stepIndex + 1]);
    }
  }

  function back() {
    if (stepIndex > 0) {
      setStep(ALL_STEPS[stepIndex - 1]);
    }
  }

  function submit() {
    setSubmitted(true);
  }

  function handleSaveDraft(stayOnPage: boolean) {
    const draft = snapshot();
    if (stayOnPage) {
      onSaveDraft?.(draft);
      setDraftSaved(true);
      window.setTimeout(() => setDraftSaved(false), 2000);
    } else {
      onCancel(draft);
    }
  }

  const stepContent = (() => {
    switch (step) {
      case "A_IDENTITAS":
        return <IdentitasSection applicant={applicant} />;
      case "B_KELUARGA":
        return <KondisiKeluargaSection value={answers.partB} onChange={(value) => setAnswers((prev) => ({ ...prev, partB: value }))} />;
      case "C_PEKERJAAN":
        return <PekerjaanSection value={answers.partC} onChange={(value) => setAnswers((prev) => ({ ...prev, partC: value }))} />;
      case "D_ASET":
        return <AsetSection value={answers.partD} onChange={(value) => setAnswers((prev) => ({ ...prev, partD: value }))} />;
      case "E_KESEHATAN":
        return <KesehatanSection value={answers.partE} onChange={(value) => setAnswers((prev) => ({ ...prev, partE: value }))} />;
      default:
        return null;
    }
  })();

  return (
    <main className="max-w-4xl mx-auto p-6">
      <Card className="rounded-2xl shadow-xl">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">Survei Kelayakan Bantuan</CardTitle>
              <CardDescription>Lengkapi survei untuk memperbarui data keluarga Anda.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => onCancel()} disabled={disableNav}>Batal</Button>
              <Button variant="outline" onClick={() => handleSaveDraft(false)} disabled={disableNav}>
                Simpan &amp; Keluar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Tahap {stepIndex + 1} dari {ALL_STEPS.length}
                </p>
                <p className="text-2xl font-semibold text-slate-900">{STEP_LABELS[step]}</p>
              </div>
            </div>
            <Progress value={progress} aria-label={`Progress ${progress}%`} />
            <Stepper current={step} />
            {draftSaved && (
              <div className="rounded border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-700">
                Draft survei tersimpan. Anda dapat melanjutkan kapan saja melalui dashboard.
              </div>
            )}
            {submitted && (
              <div className="rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Survei berhasil dikirim. Mengarahkan ke dashboard...
              </div>
            )}
          </section>

          {stepContent}

          <div className="flex flex-wrap justify-between gap-2 pt-4">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleSaveDraft(true)} disabled={disableNav}>
                Simpan draft
              </Button>
              {stepIndex > 0 && (
                <Button variant="secondary" onClick={back} disabled={disableNav}>
                  Sebelumnya
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {stepIndex < ALL_STEPS.length - 1 ? (
                <Button onClick={next} disabled={disableNav}>Lanjut</Button>
              ) : (
                <Button onClick={submit} disabled={disableNav}>Kirim Survei</Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function Stepper({ current }: { current: StepKey }) {
  const idx = ALL_STEPS.indexOf(current);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
      {ALL_STEPS.map((step, index) => (
        <Badge key={step} variant={index <= idx ? "default" : "secondary"} className="w-full justify-center rounded-2xl">
          {index + 1}. {STEP_LABELS[step]}
        </Badge>
      ))}
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex flex-col">
      <Label className="text-xs text-slate-500">{label}</Label>
      <div className="rounded border bg-white px-3 py-2 text-sm text-slate-700">{value || "-"}</div>
    </div>
  );
}

function IdentitasSection({ applicant }: { applicant: Applicant }) {
  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identitas Diri</CardTitle>
          <CardDescription>Data otomatis diambil dari hasil OCR KTP.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <FieldRow label="Nama Lengkap" value={applicant.name} />
          <FieldRow label="Nomor Induk Kependudukan (NIK)" value={applicant.number} />
          <FieldRow label="Nomor Kartu Keluarga" value={"9212000192"} />
          <FieldRow label="Status dalam keluarga" value="Kepala Keluarga" />
          <FieldRow label="Umur" value="35" />
          <FieldRow label="Status Perkawinan" value="Menikah" />
        </CardContent>
      </Card>
    </section>
  );
}

function KondisiKeluargaSection({ value, onChange }: { value: SurveyAnswers["partB"]; onChange: (v: SurveyAnswers["partB"]) => void }) {
  const update = (patch: Partial<SurveyAnswers["partB"]>) => onChange({ ...value, ...patch });
  const countOptions = [
    { value: "0", label: "Tidak ada" },
    { value: "1", label: "1" },
    { value: "2", label: "2" },
    { value: "3", label: "3" },
    { value: "10", label: "10" },
  ];
  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">B. Kondisi Keluarga</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Jumlah anggota keluarga dalam KK</Label>
              <Input
                type="number"
                min={1}
                value={value.householdMembers}
                onChange={(e) => update({ householdMembers: e.target.value === "" ? "" : Number(e.target.value) })}
                placeholder="contoh: 4"
              />
            </div>
            <div className="space-y-1">
              <Label>Jumlah tanggungan anak sekolah</Label>
              <select
                className="w-full rounded border px-3 py-2 text-sm"
                value={value.schoolChildren}
                onChange={(e) => update({ schoolChildren: e.target.value })}
              >
                <option value="">Pilih jumlah</option>
                {countOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Anggota balita / anak usia dini</Label>
              <select
                className="w-full rounded border px-3 py-2 text-sm"
                value={value.toddlers}
                onChange={(e) => update({ toddlers: e.target.value })}
              >
                <option value="">Pilih jumlah</option>
                {countOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Anggota lansia (&gt;60 tahun)</Label>
              <select
                className="w-full rounded border px-3 py-2 text-sm"
                value={value.elderly}
                onChange={(e) => update({ elderly: e.target.value })}
              >
                <option value="">Pilih jumlah</option>
                {countOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Anggota dengan disabilitas/penyakit kronis</Label>
              <select
                className="w-full rounded border px-3 py-2 text-sm"
                value={value.disability}
                onChange={(e) => update({ disability: e.target.value })}
              >
                <option value="">Pilih jawaban</option>
                <option value="Tidak ada">Tidak ada</option>
                <option value="Ada">Ada</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function PekerjaanSection({ value, onChange }: { value: SurveyAnswers["partC"]; onChange: (v: SurveyAnswers["partC"]) => void }) {
  const update = (patch: Partial<SurveyAnswers["partC"]>) => onChange({ ...value, ...patch });
  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">C. Pendidikan dan Pekerjaan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Pendidikan terakhir Kepala Keluarga</Label>
            <select
              className="w-full rounded border px-3 py-2 text-sm"
              value={value.education}
              onChange={(e) => update({ education: e.target.value })}
            >
              <option value="">Pilih pendidikan</option>
              <option value="Tidak sekolah">Tidak sekolah</option>
              <option value="SD">SD</option>
              <option value="SMP">SMP</option>
              <option value="SMA / SMK">SMA / SMK</option>
              <option value="D1-D3">D1-D3</option>
              <option value="S1 ke atas">S1 ke atas</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label>Pekerjaan Kepala Keluarga</Label>
            <Input
              value={value.occupation}
              onChange={(e) => update({ occupation: e.target.value })}
              placeholder="contoh: Buruh harian"
            />
          </div>
          <div className="space-y-1">
            <Label>Pendapatan rata-rata per bulan</Label>
            <select
              className="w-full rounded border px-3 py-2 text-sm"
              value={value.income}
              onChange={(e) => update({ income: e.target.value })}
            >
              <option value="">Pilih rentang pendapatan</option>
              <option value="< Rp 1.000.000">&lt; Rp 1.000.000</option>
              <option value="Rp1.000.000 – Rp2.000.000">Rp1.000.000 – Rp2.000.000</option>
              <option value="Rp2.000.000 – Rp3.000.000">Rp2.000.000 – Rp3.000.000</option>
              <option value="> Rp3.000.000">&gt; Rp3.000.000</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label>Sumber penghasilan tambahan (opsional)</Label>
            <Textarea
              rows={3}
              value={value.extraIncome}
              onChange={(e) => update({ extraIncome: e.target.value })}
              placeholder="Tuliskan jika ada"
            />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function AsetSection({ value, onChange }: { value: SurveyAnswers["partD"]; onChange: (v: SurveyAnswers["partD"]) => void }) {
  const update = (patch: Partial<SurveyAnswers["partD"]>) => onChange({ ...value, ...patch });
  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">D. Kondisi Tempat Tinggal</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <DropdownField
            label="Status kepemilikan rumah"
            value={value.homeOwnership}
            onChange={(val) => update({ homeOwnership: val })}
            options={["Milik sendiri", "Kontrak", "Numpang", "Pinjam pakai"]}
          />
          <DropdownField
            label="Jenis lantai rumah"
            value={value.floorType}
            onChange={(val) => update({ floorType: val })}
            options={["Tanah", "Papan", "Semen", "Keramik"]}
          />
          <DropdownField
            label="Jenis dinding rumah"
            value={value.wallType}
            onChange={(val) => update({ wallType: val })}
            options={["Bambu/Triplek", "Kayu", "Tembok tanpa plester", "Tembok bata diplester"]}
          />
          <DropdownField
            label="Jenis atap rumah"
            value={value.roofType}
            onChange={(val) => update({ roofType: val })}
            options={["Daun/Rumbia", "Seng", "Asbes", "Genteng/Beton"]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">D. Aset & Fasilitas</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <DropdownField
            label="Kepemilikan kendaraan"
            value={value.vehicle}
            onChange={(val) => update({ vehicle: val })}
            options={["Motor", "Mobil", "Tidak punya"]}
          />
          <DropdownField
            label="Kepemilikan tabungan/harta lancar"
            value={value.savings}
            onChange={(val) => update({ savings: val })}
            options={["Ada", "Tidak"]}
          />
          <DropdownField
            label="Sumber energi penerangan"
            value={value.lighting}
            onChange={(val) => update({ lighting: val })}
            options={["Listrik PLN subsidi", "Listrik PLN non-subsidi", "Non-PLN", "Tidak ada listrik"]}
          />
          <DropdownField
            label="Sumber air minum"
            value={value.waterSource}
            onChange={(val) => update({ waterSource: val })}
            options={["PDAM", "Sumur gali", "Air isi ulang", "Sungai", "Numpang"]}
          />
          <DropdownField
            label="Bahan bakar memasak"
            value={value.cookingFuel}
            onChange={(val) => update({ cookingFuel: val })}
            options={["Gas LPG", "Kayu bakar", "Minyak tanah", "Lainnya"]}
          />
          <DropdownField
            label="Tempat buang air besar"
            value={value.toilet}
            onChange={(val) => update({ toilet: val })}
            options={["Toilet sendiri di rumah", "Toilet bersama", "Tidak ada toilet"]}
          />
          <DropdownField
            label="Pembuangan limbah kamar mandi/dapur"
            value={value.wasteDisposal}
            onChange={(val) => update({ wasteDisposal: val })}
            options={["Got tertutup", "Got terbuka", "Dibiarkan mengalir"]}
          />
          <DropdownField
            label="Kondisi sanitasi"
            value={value.sanitation}
            onChange={(val) => update({ sanitation: val })}
            options={["Sehat", "Kurang sehat", "Tidak sehat"]}
          />
        </CardContent>
      </Card>
    </section>
  );
}

function KesehatanSection({ value, onChange }: { value: SurveyAnswers["partE"]; onChange: (v: SurveyAnswers["partE"]) => void }) {
  const update = (patch: Partial<SurveyAnswers["partE"]>) => onChange({ ...value, ...patch });
  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">E. Kesehatan dan Kebiasaan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label>Apakah rutin melakukan pemeriksaan kesehatan (puskesmas, posyandu, dll)?</Label>
          <select
            className="w-full rounded border px-3 py-2 text-sm"
            value={value.healthCheck}
            onChange={(e) => update({ healthCheck: e.target.value })}
          >
            <option value="">Pilih jawaban</option>
            <option value="Ya">Ya</option>
            <option value="Kadang-kadang">Kadang-kadang</option>
            <option value="Tidak">Tidak</option>
          </select>
        </CardContent>
      </Card>
    </section>
  );
}

function DropdownField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <select
        className="w-full rounded border px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Pilih...</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

function SurveySummary({ applicant, answers, status, onClose }: { applicant: Applicant; answers: SurveyAnswers; status: SurveyStatus; onClose: () => void }) {
  const statusInfo = formatSurveyStatus(status);
  return (
    <main className="max-w-4xl mx-auto p-6">
      <Card className="rounded-2xl shadow-xl">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">Ringkasan Survei Keluarga</CardTitle>
              <CardDescription>Periksa kembali jawaban yang telah dikirim.</CardDescription>
            </div>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <IdentitasSection applicant={applicant} />
          <SummarySection title="B. Kondisi Keluarga">
            <SummaryItem
              label="Jumlah anggota keluarga"
              value={answers.partB.householdMembers === "" ? "-" : String(answers.partB.householdMembers)}
            />
            <SummaryItem label="Tanggungan anak sekolah" value={formatCountValue(answers.partB.schoolChildren)} />
            <SummaryItem label="Balita / anak usia dini" value={formatCountValue(answers.partB.toddlers)} />
            <SummaryItem label="Lansia" value={formatCountValue(answers.partB.elderly)} />
            <SummaryItem label="Disabilitas / penyakit kronis" value={answers.partB.disability || "-"} />
          </SummarySection>
          <SummarySection title="C. Pendidikan dan Pekerjaan">
            <SummaryItem label="Pendidikan terakhir" value={answers.partC.education || "-"} />
            <SummaryItem label="Pekerjaan kepala keluarga" value={answers.partC.occupation || "-"} />
            <SummaryItem label="Pendapatan per bulan" value={answers.partC.income || "-"} />
            <SummaryItem label="Penghasilan tambahan" value={answers.partC.extraIncome || "-"} />
          </SummarySection>
          <SummarySection title="D. Kondisi Tempat Tinggal & Aset">
            <SummaryItem label="Status kepemilikan rumah" value={answers.partD.homeOwnership || "-"} />
            <SummaryItem label="Jenis lantai" value={answers.partD.floorType || "-"} />
            <SummaryItem label="Jenis dinding" value={answers.partD.wallType || "-"} />
            <SummaryItem label="Jenis atap" value={answers.partD.roofType || "-"} />
            <SummaryItem label="Kepemilikan kendaraan" value={answers.partD.vehicle || "-"} />
            <SummaryItem label="Tabungan / harta lancar" value={answers.partD.savings || "-"} />
            <SummaryItem label="Energi penerangan" value={answers.partD.lighting || "-"} />
            <SummaryItem label="Sumber air minum" value={answers.partD.waterSource || "-"} />
            <SummaryItem label="Bahan bakar memasak" value={answers.partD.cookingFuel || "-"} />
            <SummaryItem label="Tempat buang air besar" value={answers.partD.toilet || "-"} />
            <SummaryItem label="Pembuangan limbah" value={answers.partD.wasteDisposal || "-"} />
            <SummaryItem label="Kondisi sanitasi" value={answers.partD.sanitation || "-"} />
          </SummarySection>
          <SummarySection title="E. Kesehatan dan Kebiasaan">
            <SummaryItem label="Pemeriksaan kesehatan rutin" value={answers.partE.healthCheck || "-"} />
          </SummarySection>
          <div className="flex justify-end">
            <Button onClick={onClose}>Kembali ke Dashboard</Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function SummarySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {children}
      </CardContent>
    </Card>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="rounded border bg-white px-3 py-2 text-sm text-slate-700">{value || "-"}</span>
    </div>
  );
}

function formatSurveyStatus(status: SurveyStatus) {
  switch (status) {
    case "antrean":
      return { label: "Dalam antrean verifikasi", variant: "secondary" as const };
    case "diperiksa":
      return { label: "Sedang diperiksa TKSK", variant: "secondary" as const };
    case "disetujui":
      return { label: "Disetujui", variant: "default" as const };
    case "ditolak":
      return { label: "Ditolak", variant: "destructive" as const };
    default:
      return { label: "Belum dikumpulkan", variant: "outline" as const };
  }
}

const COUNT_LABELS: Record<string, string> = {
  "0": "Tidak ada",
  "1": "1",
  "2": "2",
  "3": "3",
  "10": "10",
};

function formatCountValue(value: string) {
  if (!value) return "-";
  return COUNT_LABELS[value] ?? value;
}
