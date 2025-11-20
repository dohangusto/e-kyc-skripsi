import React from "react";
import { useEffect, useState } from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { maskNik, unmaskNik } from "@shared/utils";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  IdCard,
  Camera,
  ScanFace,
  ShieldCheck,
  Check,
  User2,
  Repeat,
} from "lucide-react";
import { PencilLine } from "lucide-react";

import { sleep, shuffle } from "@shared/utils";

import { CameraCapture } from "@presentation/components/camera/CameraComponents";

function Section({
  icon,
  title,
  desc,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
        {desc && <CardDescription>{desc}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

/**************************
 * 1) KTP CAMERA CAPTURE
 **************************/
export function KtpCaptureStep({
  onCapture,
}: {
  onCapture: (blob: Blob) => void;
}) {
  return (
    <Section
      icon={<IdCard className="w-5 h-5" />}
      title="Ambil Foto KTP"
      desc="Posisikan KTP di dalam frame. Silahkan capture saat KTP stabil, terang, dan tajam."
    >
      <CameraCapture variant="ktp" onCapture={onCapture} />
      <p className="text-xs text-slate-500">
        <span className="font-semibold text-slate-600">Keamanan:</span> Foto
        hanya digunakan untuk verifikasi penerima bantuan sosial dan tidak
        disimpan di perangkat Anda.
      </p>
      <Alert>
        <AlertTitle>Tips</AlertTitle>
        <AlertDescription>
          Letakkan KTP di permukaan datar, pencahayaan merata, hindari pantulan.
          Ikon reticle akan hijau saat kondisi bagus.
        </AlertDescription>
      </Alert>
    </Section>
  );
}

/**************************
 * 2) REVIEW OCR (pretty)
 **************************/
export function OcrReviewStep({
  ocr,
  ktpImage,
  onBack,
  onNext,
  dispatch,
}: {
  ocr: {
    number?: string;
    name?: string;
    birthDate?: string;
    address?: string;
  } | null;
  ktpImage?: File;
  onBack: () => void;
  onNext: () => void;
  dispatch: (a: any) => void;
}) {
  const manualOcr = ocr ?? { number: "", name: "", birthDate: "", address: "" };

  // Simpan OCR awal (snapshot) untuk deteksi "edited"
  const originalRef = React.useRef<{
    number?: string;
    name?: string;
    birthDate?: string;
    address?: string;
  } | null>(null);
  if (originalRef.current == null) {
    // deep copy sederhana
    originalRef.current = JSON.parse(JSON.stringify(manualOcr));
  }
  const original = originalRef.current ?? {};

  const set = (patch: Partial<typeof manualOcr>) =>
    dispatch({ type: "PATCH_OCR", patch });

  // Validasi ringan
  const nikRaw = unmaskNik(manualOcr.number ?? "");
  const nikOk = /^\d{16}$/.test(nikRaw);
  const dateOk =
    !manualOcr.birthDate || /^\d{4}-\d{2}-\d{2}$/.test(manualOcr.birthDate);

  // Edited detector (normalize dulu kalau perlu)
  const isEdited = {
    number:
      unmaskNik(manualOcr.number ?? "") !== unmaskNik(original.number ?? ""),
    name: (manualOcr.name ?? "") !== (original.name ?? ""),
    birthDate: (manualOcr.birthDate ?? "") !== (original.birthDate ?? ""),
    address: (manualOcr.address ?? "") !== (original.address ?? ""),
  };

  const [ktpPreview, setKtpPreview] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!ktpImage) {
      setKtpPreview(undefined);
      return;
    }
    const url = URL.createObjectURL(ktpImage);
    setKtpPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [ktpImage]);

  return (
    <Section
      icon=""
      title="Isi Data KTP"
      desc="Tidak ada auto-complete. Silakan isi data identitas secara manual, perubahan tersimpan otomatis."
    >
      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
        <div className="space-y-4">
          {/* NIK */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="nik">NIK</Label>
              {isEdited.number && (
                <Badge variant="secondary" className="ml-2">
                  <PencilLine className="w-3 h-3 mr-1" />
                  edited
                </Badge>
              )}
            </div>
            <Input
              id="nik"
              inputMode="numeric"
              value={maskNik(manualOcr.number ?? "")}
              onChange={(e) => set({ number: unmaskNik(e.target.value) })}
              onBlur={(e) => set({ number: unmaskNik(e.target.value) })}
              className={
                !nikOk ? "border-red-500 focus-visible:ring-red-500" : ""
              }
              placeholder="Masukkan 16 digit NIK secara manual"
            />
            {!nikOk && (
              <p className="text-xs text-red-600 mt-1">NIK harus 16 digit</p>
            )}
          </div>

          {/* Nama */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="nama">Nama</Label>
              {isEdited.name && (
                <Badge variant="secondary" className="ml-2">
                  <PencilLine className="w-3 h-3 mr-1" />
                  edited
                </Badge>
              )}
            </div>
            <Input
              id="nama"
              value={manualOcr.name ?? ""}
              onChange={(e) => set({ name: e.target.value })}
              onBlur={(e) => set({ name: e.target.value })}
              placeholder="Masukkan nama sesuai KTP (ketik manual)"
            />
          </div>

          {/* Tanggal Lahir (datepicker) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="ttl">Tanggal Lahir</Label>
              {isEdited.birthDate && (
                <Badge variant="secondary" className="ml-2">
                  <PencilLine className="w-3 h-3 mr-1" />
                  edited
                </Badge>
              )}
            </div>
            <Input
              id="ttl"
              type="date"
              value={manualOcr.birthDate ?? ""}
              onChange={(e) => set({ birthDate: e.target.value })}
              placeholder="YYYY-MM-DD atau pilih tanggal"
              className={
                !dateOk ? "border-red-500 focus-visible:ring-red-500" : ""
              }
            />
            {!dateOk && (
              <p className="text-xs text-red-600 mt-1">
                Format: YYYY-MM-DD. Bisa ketik manual atau pilih lewat picker.
              </p>
            )}
          </div>

          {/* Alamat */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="alamat">Alamat</Label>
              {isEdited.address && (
                <Badge variant="secondary" className="ml-2">
                  <PencilLine className="w-3 h-3 mr-1" />
                  edited
                </Badge>
              )}
            </div>
            <Textarea
              id="alamat"
              value={manualOcr.address ?? ""}
              onChange={(e) => set({ address: e.target.value })}
              onBlur={(e) => set({ address: e.target.value })}
              placeholder="Isi alamat sesuai KTP (ketik manual)"
              rows={3}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Preview Foto KTP</Label>
          <div className="rounded-lg border bg-slate-50 p-3">
            {ktpPreview ? (
              <img
                src={ktpPreview}
                alt="Foto KTP"
                className="w-full rounded-md border bg-white object-contain max-h-72"
              />
            ) : (
              <p className="text-sm text-slate-500">
                Belum ada foto KTP. Ambil ulang di langkah sebelumnya jika
                diperlukan.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <Button variant="secondary" onClick={onBack}>
          Kembali
        </Button>
        <Button onClick={onNext} disabled={!nikOk || !dateOk}>
          Lanjut
        </Button>
      </div>
    </Section>
  );
}

export function Field({
  label,
  value,
  className,
}: {
  label: string;
  value?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-xs text-slate-500">{label}</Label>
      <div className="p-2 rounded border bg-white text-sm">{value || "-"}</div>
    </div>
  );
}

/****************************************
 * 3) SELFIE CAMERA with Oval Guide
 ****************************************/
export function SelfieCaptureStep({
  onBack,
  onCapture,
}: {
  onBack: () => void;
  onCapture: (blob: Blob) => void;
}) {
  return (
    <Section
      icon={<Camera className="w-5 h-5" />}
      title="Selfie + Pegang KTP"
      desc="Posisikan wajah di dalam oval guide. Pastikan dalam kondisi terang, dan kamera stabil."
    >
      <CameraCapture variant="selfie" onCapture={onCapture} />
      <p className="text-xs text-slate-500">
        <span className="font-semibold text-slate-600">Keamanan:</span> Foto
        hanya digunakan untuk verifikasi bansos dan tidak disimpan di perangkat
        Anda.
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onBack}>
          Kembali
        </Button>
      </div>
    </Section>
  );
}

/****************************************
 * 4) FACE REVIEW (no score)
 ****************************************/
export function FaceReviewStep({
  ktpImage,
  ktpCropImage,
  selfieImage,
  onBackSelfie,
  onBackKtp,
  onConfirm,
}: {
  ktpImage?: string;
  ktpCropImage?: string;
  selfieImage?: string;
  onBackSelfie: () => void;
  onBackKtp: () => void;
  onConfirm: () => void;
}) {
  return (
    <Section
      icon={<ScanFace className="w-5 h-5" />}
      title="Komparasi Wajah"
      desc="Pastikan foto selfie dan pas foto KTP tampak sama orangnya."
    >
      <div className="grid md:grid-cols-3 gap-4 items-start">
        <PreviewBox title="Selfie" src={selfieImage} />
        <PreviewBox title="Pas Foto (crop KTP)" src={ktpCropImage} />
        <PreviewBox title="KTP (asli)" src={ktpImage} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={onBackSelfie}>
          <Repeat className="w-4 h-4 mr-2" />
          Ulangi Selfie
        </Button>
        <Button variant="secondary" onClick={onBackKtp}>
          <Repeat className="w-4 h-4 mr-2" />
          Ulangi KTP
        </Button>
        <Button onClick={onConfirm}>
          <Check className="w-4 h-4 mr-2" />
          Sudah Sesuai
        </Button>
      </div>
    </Section>
  );
}

function PreviewBox({ title, src }: { title: string; src?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {src ? (
          <img
            src={src}
            alt={title}
            className="w-full rounded-lg border object-contain max-h-64 bg-slate-50"
          />
        ) : (
          <div className="text-sm text-slate-500">Belum ada gambar</div>
        )}
      </CardContent>
    </Card>
  );
}

/****************************************
 * 5) LIVENESS CAMERA + INSTRUCTIONS (dummy)
 ****************************************/
const GESTURES = [
  "Kedipkan mata",
  "Tengok kiri",
  "Tengok kanan",
  "Angguk",
  "Geleng",
  "Maju-mundur kepala",
] as const;

export function LivenessStep({
  onBack,
  onRun,
  processing,
}: {
  onBack: () => void;
  onRun: (gestures: string[]) => Promise<void>;
  processing?: boolean;
}) {
  const [current, setCurrent] = useState<string | null>(null);
  const [queue] = useState<string[]>(() => shuffle([...GESTURES]).slice(0, 3));
  const [running, setRunning] = useState(false);

  async function start() {
    if (processing || running) return;
    setRunning(true);
    for (const g of queue) {
      setCurrent(g);
      await sleep(1500);
    }
    try {
      await onRun(queue);
    } finally {
      setRunning(false);
    }
  }

  return (
    <Section
      icon={<ShieldCheck className="w-5 h-5" />}
      title="Liveness Detection"
      desc="Ikuti instruksi gestur secara berurutan."
    >
      <CameraCapture variant="selfie" liveOnly />
      <p className="text-xs text-slate-500">
        <span className="font-semibold text-slate-600">Keamanan:</span>{" "}
        Streaming kamera live hanya dipakai untuk memastikan pemegang KTP adalah
        Anda sendiri.
      </p>
      <div className="p-3 rounded bg-slate-50 border">
        <p className="text-sm mb-2">
          <strong>Instruksi:</strong> {current ?? "—"}
        </p>
        <div className="flex gap-2 flex-wrap">
          {queue.map((q, i) => (
            <Badge
              key={q}
              variant={current === q ? "default" : "secondary"}
              className="rounded-full"
            >
              {i + 1}. {q}
            </Badge>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onBack}>
          Kembali
        </Button>
        <Button onClick={start} disabled={running}>
          {processing || running ? "Memproses..." : "Mulai"}
        </Button>
      </div>
    </Section>
  );
}

/****************************************
 * 6) DATA ENTRY (unchanged)
 ****************************************/
export function DataEntryStep({
  onBack,
  onPatch,
  onNext,
}: {
  onBack: () => void;
  onPatch: (p: any) => void;
  onNext: () => void;
}) {
  return (
    <Section
      icon={<User2 className="w-5 h-5" />}
      title="Data Tambahan"
      desc="Lengkapi kontak untuk proses verifikasi."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Nomor HP</Label>
          <Input
            placeholder="08xxxxxxxxxx"
            onChange={(e) => onPatch({ phone: e.target.value })}
          />
        </div>
        <div>
          <Label>Email</Label>
          <Input
            type="email"
            placeholder="nama@domain.com"
            onChange={(e) => onPatch({ email: e.target.value })}
          />
        </div>
        <div className="md:col-span-2">
          <Label>Alamat (opsional)</Label>
          <Textarea
            placeholder="Sesuai KTP, RT/RW, Kel/Desa, Kec, Kota/Kab"
            onChange={(e) => onPatch({ address: e.target.value })}
          />
        </div>
        <div>
          <Label>PIN Akses (6 digit)</Label>
          <Input
            type="password"
            placeholder="******"
            maxLength={6}
            onChange={(e) => onPatch({ pin: e.target.value })}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onBack}>
          Kembali
        </Button>
        <Button onClick={onNext}>Lanjut</Button>
      </div>
    </Section>
  );
}

/****************************************
 * 7) REVIEW & SUBMIT (pretty, boolean verdicts)
 ****************************************/
export function ReviewSubmitStep({
  ocr,
  contact,
  verdict,
  onBack,
  onSubmit,
  submitting,
  error,
}: {
  ocr: any;
  contact: any;
  verdict: { face: boolean; liveness: boolean };
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  error?: string;
}) {
  return (
    <Section
      icon={<Check className="w-5 h-5" />}
      title="Review & Submit"
      desc="Pastikan semua data sesuai."
    >
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Identitas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Row k="NIK" v={ocr.number} />
            <Row k="Nama" v={ocr.name} />
            <Row k="Tanggal Lahir" v={ocr.birthDate} />
            <Row k="Alamat" v={ocr.address} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kontak</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Row k="HP" v={contact.phone} />
            <Row k="Email" v={contact.email} />
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Hasil Otomatis</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <Verdict
              title="Kecocokan Wajah"
              ok={verdict.face}
              okText="Wajah antara KTP dan selfie sesuai"
              badText="Maaf, wajah antara KTP dan selfie tidak sesuai, silakan coba lagi"
            />
            <Verdict
              title="Liveness"
              ok={verdict.liveness}
              okText="Gestur diikuti"
              badText="Gestur tidak sesuai"
            />
          </CardContent>
        </Card>
      </div>
      {error && (
        <Alert className="border-red-300">
          <AlertTitle>Submit gagal</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onBack}>
          Kembali
        </Button>
        <Button onClick={onSubmit}>
          {submitting ? "Mengirim..." : "Kirim Verifikasi"}
        </Button>
      </div>
    </Section>
  );
}

function Row({ k, v }: { k: string; v?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-500">{k}</span>
      <span className="font-medium">{v || "-"}</span>
    </div>
  );
}

function Verdict({
  title,
  ok,
  okText,
  badText,
}: {
  title: string;
  ok: boolean;
  okText: string;
  badText: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {ok ? (
          <div className="px-3 py-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
            ✅ {okText}
          </div>
        ) : (
          <div className="px-3 py-2 rounded bg-red-50 border border-red-200 text-red-700 text-sm">
            ❌ {badText}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/****************************************
 * 8) DONE
 ****************************************/
export function DoneStep({
  id,
  applicant,
}: {
  id: string;
  applicant?: { phone?: string; name?: string };
}) {
  return (
    <div className="text-center space-y-4 py-8">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100">
        <Check className="w-8 h-8" />
      </div>
      <h3 className="text-2xl font-semibold">Verifikasi Terkirim</h3>
      <p className="text-slate-600">ID Pengajuan: {id}</p>
      <div className="max-w-md mx-auto space-y-2 text-sm text-slate-500">
        <p>
          Data Anda akan diverifikasi oleh petugas dinas sosial dalam waktu 1–2
          hari kerja.
        </p>
        <p>Pastikan nomor HP Anda aktif untuk menerima konfirmasi lanjutan.</p>
        {applicant?.phone && (
          <p>
            Nomor HP terdaftar:{" "}
            <span className="font-semibold text-slate-700">
              {applicant.phone}
            </span>
          </p>
        )}
        <p>
          PIN akses dashboard akan dibuat setelah Anda masuk ke dashboard. Ikuti
          instruksi yang tampil di sana.
        </p>
      </div>
    </div>
  );
}
