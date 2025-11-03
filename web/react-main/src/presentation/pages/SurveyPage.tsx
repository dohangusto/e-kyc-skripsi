import { useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import type { Applicant } from "@domain/types";
import type { SurveyAnswers } from "@domain/entities/account";

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
  onCancel: () => void;
  onSubmit: (answers: SurveyAnswers) => void;
};

export default function SurveyPage({ applicant, existingAnswers, onCancel, onSubmit }: SurveyPageProps) {
  const [step, setStep] = useState<StepKey>(ALL_STEPS[0]);
  const [answers, setAnswers] = useState<SurveyAnswers>(() => existingAnswers ? {
    partB: { ...defaultAnswers.partB, ...existingAnswers.partB },
    partC: { ...defaultAnswers.partC, ...existingAnswers.partC },
    partD: { ...defaultAnswers.partD, ...existingAnswers.partD },
    partE: { ...defaultAnswers.partE, ...existingAnswers.partE },
  } : createDefaultAnswers());

  const stepIndex = ALL_STEPS.indexOf(step);
  const progress = useMemo(() => Math.round(((stepIndex + 1) / ALL_STEPS.length) * 100), [stepIndex]);

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
    onSubmit(JSON.parse(JSON.stringify(answers)));
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
            <Badge variant="secondary" className="rounded-full">{STEP_LABELS[step]}</Badge>
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
              <Button variant="ghost" onClick={onCancel}>Kembali ke Dashboard</Button>
            </div>
            <Progress value={progress} aria-label={`Progress ${progress}%`} />
            <Stepper current={step} />
          </section>

          {stepContent}

          <div className="flex flex-wrap justify-between gap-2 pt-4">
            <div className="flex gap-2">
              {stepIndex > 0 && <Button variant="secondary" onClick={back}>Sebelumnya</Button>}
            </div>
            <div className="flex gap-2">
              {stepIndex < ALL_STEPS.length - 1 ? (
                <Button onClick={next}>Lanjut</Button>
              ) : (
                <Button onClick={submit}>Kirim Survei</Button>
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

type PartBValue = SurveyAnswers["partB"];
function KondisiKeluargaSection({ value, onChange }: { value: PartBValue; onChange: (v: PartBValue) => void }) {
  const update = (patch: Partial<PartBValue>) => onChange({ ...value, ...patch });
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
              <Input
                value={value.schoolChildren}
                onChange={(e) => update({ schoolChildren: e.target.value })}
                placeholder="contoh: 2 anak SMP"
              />
            </div>
            <div className="space-y-1">
              <Label>Anggota balita / anak usia dini</Label>
              <Input
                value={value.toddlers}
                onChange={(e) => update({ toddlers: e.target.value })}
                placeholder="Ada / Tidak ada (sebutkan)"
              />
            </div>
            <div className="space-y-1">
              <Label>Anggota lansia (&gt;60 tahun)</Label>
              <Input
                value={value.elderly}
                onChange={(e) => update({ elderly: e.target.value })}
                placeholder="Ada / Tidak ada"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Anggota dengan disabilitas/penyakit kronis</Label>
              <Textarea
                value={value.disability}
                onChange={(e) => update({ disability: e.target.value })}
                placeholder="Ya/Tidak, sebutkan jika ada"
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

type PartCValue = SurveyAnswers["partC"];
function PekerjaanSection({ value, onChange }: { value: PartCValue; onChange: (v: PartCValue) => void }) {
  const update = (patch: Partial<PartCValue>) => onChange({ ...value, ...patch });
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
              <option value="tidak-sekolah">Tidak sekolah</option>
              <option value="sd">SD</option>
              <option value="smp">SMP</option>
              <option value="sma">SMA / SMK</option>
              <option value="diploma">D1-D3</option>
              <option value="sarjana">S1 ke atas</option>
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
              <option value="lt1jt">&lt; Rp 1.000.000</option>
              <option value="1-2jt">Rp1.000.000 – Rp2.000.000</option>
              <option value="2-3jt">Rp2.000.000 – Rp3.000.000</option>
              <option value="gt3jt">&gt; Rp3.000.000</option>
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

type PartDValue = SurveyAnswers["partD"];
function AsetSection({ value, onChange }: { value: PartDValue; onChange: (v: PartDValue) => void }) {
  const update = (patch: Partial<PartDValue>) => onChange({ ...value, ...patch });
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

type PartEValue = SurveyAnswers["partE"];
function KesehatanSection({ value, onChange }: { value: PartEValue; onChange: (v: PartEValue) => void }) {
  const update = (patch: Partial<PartEValue>) => onChange({ ...value, ...patch });
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
            <option value="ya">Ya</option>
            <option value="kadang">Kadang-kadang</option>
            <option value="tidak">Tidak</option>
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
