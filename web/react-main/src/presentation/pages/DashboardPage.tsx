import { useEffect, useMemo, useState, type FormEvent } from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  MapPin,
  Phone,
  Package,
  ShieldCheck,
  User,
} from "lucide-react";

import type { Applicant } from "@domain/types";
import type { SurveyStatus } from "@domain/entities/account";
import type { PortalBatch } from "@domain/entities/batch";

type VerificationStatus = "SEDANG_DITINJAU" | "DISETUJUI" | "DITOLAK";
type DisbursementStatus = "dalam antrian" | "sedang disalurkan" | "disalurkan";

export type DashboardSchedule = {
  id?: string;
  title: string;
  date?: string;
  location?: string;
  note?: string;
  status?: "PLANNED" | "IN_PROGRESS" | "COMPLETED";
  channel?: string;
  batchCodes?: string[];
  updatedAt?: string;
};

export type DashboardNotification = {
  id?: string;
  title: string;
  time?: string;
  description?: string;
};

export type DashboardData = {
  submissionId: string;
  applicant: Applicant;
  verificationStatus: VerificationStatus;
  faceMatchPassed: boolean;
  livenessPassed: boolean;
  submittedAt?: string;
  pinSet: boolean;
  surveyCompleted: boolean;
  surveyStatus: SurveyStatus;
  surveySubmittedAt?: string;
  hasSurveyDraft: boolean;
  schedules?: DashboardSchedule[];
  notifications?: DashboardNotification[];
  disbursementStatus?: DisbursementStatus;
  batches?: PortalBatch[];
};

type DashboardPageProps = {
  data: DashboardData;
  onStartNew?: () => void;
  onLogout?: () => void;
  onCreatePin?: (pin: string) => void | Promise<void>;
  onStartSurvey?: () => void;
  onContinueSurvey?: () => void;
  onViewSurvey?: () => void;
};

function maskNik(nik?: string) {
  if (!nik) return "-";
  return nik.replace(
    /^(\d{4})\d{8}(\d{4})$/,
    (_match, prefix, suffix) => `${prefix}••••••••${suffix}`,
  );
}

type BadgeStyle = {
  variant: "default" | "secondary" | "destructive" | "outline";
  className?: string;
};

function formatStatus(
  status: VerificationStatus,
): BadgeStyle & { label: string } {
  switch (status) {
    case "DISETUJUI":
      return {
        label: "Verifikasi Selesai",
        variant: "default" as const,
        className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
      };
    case "DITOLAK":
      return {
        label: "Perlu Tindakan Lanjutan",
        variant: "destructive" as const,
      };
    default:
      return {
        label: "Sedang Ditinjau Petugas",
        variant: "secondary" as const,
      };
  }
}

function formatSurveyStatus(status: SurveyStatus): {
  label: string;
  variant: "outline" | "default" | "secondary" | "destructive";
} {
  switch (status) {
    case "antrean":
      return { label: "Dalam antrean verifikasi", variant: "secondary" };
    case "diperiksa":
      return { label: "Sedang diperiksa TKSK", variant: "secondary" };
    case "disetujui":
      return { label: "Disetujui", variant: "default" };
    case "ditolak":
      return { label: "Ditolak", variant: "destructive" };
    default:
      return { label: "Belum dikumpulkan", variant: "outline" };
  }
}

export function DashboardPage({
  data,
  onStartNew,
  onLogout,
  onCreatePin,
  onStartSurvey,
  onContinueSurvey,
  onViewSurvey,
}: DashboardPageProps) {
  const status = useMemo(
    () => formatStatus(data.verificationStatus),
    [data.verificationStatus],
  );
  const identityComplete = data.faceMatchPassed && data.livenessPassed;
  const pinComplete = data.pinSet;
  const surveyComplete = data.surveyCompleted;
  const surveyReviewComplete = ["diperiksa", "disetujui", "ditolak"].includes(
    data.surveyStatus,
  );
  const agreementComplete = data.verificationStatus === "DISETUJUI";
  const disbursementState: DisbursementStatus =
    data.disbursementStatus ??
    (agreementComplete ? "dalam antrian" : "dalam antrian");
  const disbursementComplete = disbursementState === "disalurkan";

  const stageItems = useMemo(
    () => [
      {
        label: "Verifikasi Identitas Penerima",
        done: identityComplete,
        description: identityComplete
          ? "Verifikasi selesai"
          : "Menunggu pencocokan KTP & selfie",
      },
      {
        label: "Buat PIN baru",
        done: pinComplete,
        description: pinComplete ? "PIN tersimpan" : "Belum membuat PIN",
      },
      {
        label: "Lengkapi survei TKSK",
        done: surveyComplete,
        description: surveyComplete
          ? "Survei sudah dikirim"
          : data.hasSurveyDraft
            ? "Masih berupa draft"
            : "Belum mengisi survei",
      },
      {
        label: "Pengecekan survei oleh petugas",
        done: surveyReviewComplete,
        description: (() => {
          switch (data.surveyStatus) {
            case "antrean":
              return "Menunggu antrean petugas";
            case "diperiksa":
              return "Sedang diperiksa petugas";
            case "disetujui":
              return "Survei disetujui";
            case "ditolak":
              return "Survei ditolak, hubungi petugas";
            default:
              return "Belum diperiksa";
          }
        })(),
      },
      {
        label: "Persetujuan kesepakatan penyaluran",
        done: agreementComplete,
        description: agreementComplete
          ? "Kesepakatan selesai"
          : "Menunggu persetujuan Dinas Sosial",
      },
      {
        label: "Penyaluran bantuan",
        done: disbursementComplete,
        description:
          disbursementState === "disalurkan"
            ? "Bantuan sudah disalurkan"
            : disbursementState === "sedang disalurkan"
              ? "Sedang proses penyaluran"
              : "Dalam antrian penyaluran",
      },
    ],
    [
      agreementComplete,
      data.hasSurveyDraft,
      data.surveyStatus,
      disbursementComplete,
      disbursementState,
      identityComplete,
      pinComplete,
      surveyComplete,
      surveyReviewComplete,
    ],
  );

  const completion = useMemo(() => {
    const total = stageItems.length;
    const value = (stageItems.filter((item) => item.done).length / total) * 100;
    return Math.round(value);
  }, [stageItems]);
  const accountNumber = useMemo(() => {
    const digits = data.applicant.phone?.replace(/\D/g, "") ?? "";
    if (digits.length >= 8) return `62${digits.slice(-8)}`;
    return "620001234567";
  }, [data.applicant.phone]);
  const schedules = data.schedules ?? [];
  const notifications = data.notifications ?? [];

  const needsPin = !data.pinSet;
  const needsSurvey = !data.surveyCompleted;
  const hasDraft = data.hasSurveyDraft;
  const surveyStatus = useMemo(
    () => formatSurveyStatus(data.surveyStatus),
    [data.surveyStatus],
  );
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSubmitting, setPinSubmitting] = useState(false);
  const [pinSuccess, setPinSuccess] = useState(false);

  useEffect(() => {
    setPinError(null);
  }, [pin, confirmPin]);

  useEffect(() => {
    if (needsPin) {
      setPinSuccess(false);
    }
  }, [needsPin]);

  const handlePinSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!needsPin) return;
    if (!/^\d{6}$/.test(pin)) {
      setPinError("PIN harus 6 digit angka.");
      return;
    }
    if (pin !== confirmPin) {
      setPinError("PIN dan konfirmasi PIN tidak sama.");
      return;
    }
    if (!onCreatePin) {
      setPinError("Fitur set PIN belum tersedia.");
      return;
    }
    try {
      setPinSubmitting(true);
      await onCreatePin(pin);
      setPin("");
      setConfirmPin("");
      setPinSuccess(true);
    } catch (err: any) {
      setPinError(err?.message ?? "Gagal menyimpan PIN.");
    } finally {
      setPinSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white text-slate-900">
      <header className="border-b bg-white/90 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Program Bansos Terpadu
            </p>
            <h1 className="text-2xl font-semibold">
              Dashboard Penerima Bantuan
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              ID Pengajuan:{" "}
              <span className="font-mono">{data.submissionId}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {onLogout && (
              <Button variant="ghost" onClick={onLogout}>
                Keluar
              </Button>
            )}
            {onStartNew && (
              <Button variant="outline" onClick={onStartNew}>
                Ajukan Verifikasi Baru
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        {(needsPin || pinSuccess) && (
          <section>
            <div
              className={`rounded-3xl border p-6 shadow-sm ${
                needsPin
                  ? "border-amber-300 bg-amber-50"
                  : "border-emerald-200 bg-emerald-50"
              }`}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="max-w-xl space-y-2">
                  <p className="text-xs uppercase tracking-wide text-slate-600">
                    Keamanan Akun
                  </p>
                  <h2 className="text-xl font-semibold text-slate-900">
                    {needsPin
                      ? "Buat PIN 6 digit untuk mengamankan dashboard Anda"
                      : "PIN berhasil disimpan"}
                  </h2>
                  <p className="text-sm text-slate-700">
                    {needsPin
                      ? "PIN digunakan bersama nomor HP untuk masuk kembali ke dashboard bansos. Wajib dibuat sebelum Anda keluar dari sesi ini."
                      : "Nomor HP Anda kini terlindungi PIN. Gunakan kombinasi tersebut untuk masuk kembali ke dashboard kapan pun diperlukan."}
                  </p>
                </div>
                {pinSuccess && !needsPin && (
                  <div className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-700">
                    ✅ PIN tersimpan. Simpan secara pribadi dan jangan bagikan
                    kepada pihak lain.
                  </div>
                )}
              </div>
              {needsPin && (
                <form
                  className="mt-6 grid gap-4 md:grid-cols-2"
                  onSubmit={handlePinSubmit}
                >
                  <div className="space-y-2">
                    <Label htmlFor="pin-new">PIN (6 digit)</Label>
                    <Input
                      id="pin-new"
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="******"
                      value={pin}
                      onChange={(e) =>
                        setPin(e.target.value.replace(/\D/g, ""))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pin-confirm">Konfirmasi PIN</Label>
                    <Input
                      id="pin-confirm"
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="******"
                      value={confirmPin}
                      onChange={(e) =>
                        setConfirmPin(e.target.value.replace(/\D/g, ""))
                      }
                      required
                    />
                  </div>
                  <div className="md:col-span-2 space-y-3">
                    {pinError && (
                      <p className="text-sm text-red-600">{pinError}</p>
                    )}
                    <Button
                      type="submit"
                      className="w-full md:w-auto"
                      disabled={pinSubmitting}
                    >
                      {pinSubmitting ? "Menyimpan..." : "Simpan PIN Sekarang"}
                    </Button>
                    <p className="text-xs text-slate-600">
                      Simpan PIN dengan aman. Petugas tidak pernah meminta PIN
                      Anda.
                    </p>
                  </div>
                </form>
              )}
            </div>
          </section>
        )}

        {needsSurvey && (
          <section>
            <div className="rounded-3xl border border-indigo-300 bg-indigo-50 p-6 shadow-sm">
              <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-indigo-600">
                    Survei Sosial Ekonomi
                  </p>
                  <h2 className="text-xl font-semibold text-indigo-900">
                    {hasDraft
                      ? "Lanjutkan survei yang belum selesai"
                      : "Lengkapi survei keluarga Anda"}
                  </h2>
                  <p className="text-sm text-indigo-800">
                    {hasDraft
                      ? "Anda memiliki draft survei. Silakan lanjutkan pengisian agar data keluarga segera diperiksa."
                      : "Mohon isi survei kondisi keluarga, pendidikan, tempat tinggal, aset, dan kesehatan. Data ini membantu Dinas Sosial menilai prioritas penyaluran bantuan."}
                  </p>
                </div>
                {(hasDraft ? onContinueSurvey : onStartSurvey) && (
                  <Button
                    onClick={hasDraft ? onContinueSurvey : onStartSurvey}
                    size="lg"
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {hasDraft ? "Lanjutkan Survei" : "Isi Survei Sekarang"}
                  </Button>
                )}
              </div>
            </div>
          </section>
        )}

        {data.surveyCompleted && (
          <section>
            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">
                      Status Survei Keluarga
                    </CardTitle>
                    <CardDescription>
                      Terakhir dikirim {data.surveySubmittedAt ?? "-"}
                    </CardDescription>
                  </div>
                  <Badge variant={surveyStatus.variant}>
                    {surveyStatus.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-600">
                  Data survei akan digunakan petugas TKSK sebagai dasar evaluasi
                  kelayakan bantuan sosial Anda.
                </p>
                {onViewSurvey && (
                  <Button variant="outline" onClick={onViewSurvey}>
                    Lihat hasil survei
                  </Button>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        <section className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 shadow-sm">
            <CardHeader>
              <CardTitle>Tahapan Penyaluran BANSOS</CardTitle>
              <CardDescription>
                Pantau progres setiap langkah hingga bantuan diterima.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-3">
                <Badge variant={status.variant} className={status.className}>
                  {status.label}
                </Badge>
                {data.submittedAt && (
                  <div className="flex items-center text-xs text-slate-500 gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Diajukan {data.submittedAt}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Progress
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <Progress value={completion} className="h-2" />
                  <span className="text-sm font-medium text-slate-700">
                    {completion}%
                  </span>
                </div>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  {stageItems.map((stage) => (
                    <li
                      key={stage.label}
                      className="flex items-center gap-2 text-sm text-slate-600"
                    >
                      <CheckCircle2
                        className={`h-4 w-4 ${stage.done ? "text-emerald-500" : "text-slate-300"}`}
                      />
                      <span className="font-medium text-slate-700">
                        {stage.label}
                      </span>
                      <span className="ml-auto text-xs text-slate-400 text-right">
                        {stage.description}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Kelompok Bantuan</CardTitle>
              <CardDescription>
                Batch penyaluran yang telah ditetapkan untuk Anda.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!data.batches || data.batches.length === 0 ? (
                <EmptyPlaceholder message="Belum ada batch penyaluran untuk akun ini. Data akan muncul begitu admin menetapkan kelompok Anda." />
              ) : (
                data.batches.map((batch) => (
                  <BatchItem key={batch.id} batch={batch} />
                ))
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Ringkasan Pemohon</CardTitle>
              <CardDescription>
                Data diisi manual saat verifikasi.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-400" />
                <span className="font-medium text-slate-800">
                  {data.applicant.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-slate-400" />
                <span>{maskNik(data.applicant.number)}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                <span>{data.applicant.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-400" />
                <span>{data.applicant.phone}</span>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 shadow-sm">
            <CardHeader>
              <CardTitle>Jadwal Penyaluran</CardTitle>
              <CardDescription>
                Informasi tahap penyaluran bantuan untuk wilayah Anda.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {schedules.length === 0 ? (
                <EmptyPlaceholder message="Belum ada jadwal penyaluran untuk akun ini. Jadwal akan tampil otomatis begitu petugas memasukkannya." />
              ) : (
                schedules.map((item) => (
                  <ScheduleItemCard
                    key={item.id ?? `${item.title}-${item.date ?? "date"}`}
                    item={item}
                  />
                ))
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Rekening Penyaluran</CardTitle>
              <CardDescription>
                Pastikan data bank sesuai untuk pencairan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-slate-400" />
                <span>Bank Mandiri</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditMask value={accountNumber} />
              </div>
              <p className="text-xs text-slate-500">
                Jika ingin mengubah rekening, hubungi petugas Dinas Sosial
                dengan membawa buku tabungan asli.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Unduh Surat Kuasa
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="grid md:grid-cols-2 gap-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Notifikasi Penting</CardTitle>
              <CardDescription>
                Pemberitahuan terbaru terkait pengajuan Anda.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              {notifications.length === 0 ? (
                <EmptyPlaceholder message="Belum ada notifikasi penting. Kami akan menampilkan kabar terbaru begitu ada pembaruan dari petugas." />
              ) : (
                notifications.map((item) => (
                  <NotificationItem
                    key={item.id ?? `${item.title}-${item.time ?? "time"}`}
                    item={item}
                  />
                ))
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Pusat Bantuan</CardTitle>
              <CardDescription>
                Hubungi petugas jika ada kendala data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p>
                WhatsApp Hotline:{" "}
                <span className="font-medium">0811-222-3344</span>
              </p>
              <p>
                Email: <span className="font-medium">layanan@dinsos.go.id</span>
              </p>
              <p>Jam Operasional: Senin–Jumat pukul 08.00–16.00 WIB</p>
              <Button variant="secondary" size="sm">
                Kirim Pesan ke Petugas
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}

function CreditMask({ value }: { value: string }) {
  const masked = value.replace(/.(?=.{4})/g, "•");
  return <span className="font-mono tracking-wide">{masked}</span>;
}

function describeDistributionStatus(status?: string) {
  switch ((status ?? "").toUpperCase()) {
    case "IN_PROGRESS":
      return {
        label: "Sedang disalurkan",
        badgeClass:
          "bg-amber-100 text-amber-800 border border-amber-200 shadow-sm",
        accent: "border-amber-200 bg-amber-50",
        iconColor: "text-amber-600",
        icon: <Loader2 className="h-5 w-5 animate-spin" />,
      };
    case "COMPLETED":
      return {
        label: "Selesai disalurkan",
        badgeClass:
          "bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm",
        accent: "border-emerald-200 bg-emerald-50",
        iconColor: "text-emerald-600",
        icon: <CheckCircle2 className="h-5 w-5" />,
      };
    default:
      return {
        label: "Terjadwal",
        badgeClass:
          "bg-slate-100 text-slate-700 border border-slate-200 shadow-sm",
        accent: "border-slate-200 bg-slate-50",
        iconColor: "text-slate-600",
        icon: <Calendar className="h-5 w-5" />,
      };
  }
}

function formatChannel(channel?: string) {
  switch ((channel ?? "").toUpperCase()) {
    case "BANK_TRANSFER":
      return "Bank Transfer";
    case "POSPAY":
      return "PosPay";
    case "TUNAI":
      return "Tunai Langsung";
    default:
      return channel ?? "Saluran tidak dikenal";
  }
}

function ScheduleItemCard({ item }: { item: DashboardSchedule }) {
  const visuals = describeDistributionStatus(item.status);
  return (
    <div
      className={`flex items-start gap-4 rounded-xl border ${visuals.accent} p-4`}
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full bg-white ${visuals.iconColor}`}
      >
        {visuals.icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800">{item.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${visuals.badgeClass}`}
          >
            {visuals.label}
          </span>
          {item.channel && (
            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 border border-slate-200">
              {formatChannel(item.channel)}
            </span>
          )}
          {item.batchCodes && item.batchCodes.length > 0 && (
            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] text-slate-600 border border-slate-200">
              Batch: {item.batchCodes.join(", ")}
            </span>
          )}
        </div>
        {item.date && (
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" />
            {item.date}
          </p>
        )}
        {item.location && (
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5" />
            {item.location}
          </p>
        )}
        {item.note && (
          <p className="text-xs text-slate-500 mt-1">{item.note}</p>
        )}
        {item.updatedAt && (
          <p className="text-[11px] text-slate-400 mt-1">
            Diperbarui {item.updatedAt}
          </p>
        )}
      </div>
    </div>
  );
}

function NotificationItem({ item }: { item: DashboardNotification }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4">
      <p className="font-medium text-slate-800">{item.title}</p>
      {item.description && (
        <p className="text-xs text-slate-500 mt-1">{item.description}</p>
      )}
      <p className="text-xs text-slate-500 mt-1">{item.time ?? "-"}</p>
    </div>
  );
}

function BatchItem({ batch }: { batch: PortalBatch }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 flex gap-3">
      <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
        <Package className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-800">{batch.code}</p>
        <p className="text-xs text-slate-500">
          Dibuat: {formatBatchDate(batch.createdAt)}
        </p>
        {batch.status && (
          <p className="text-xs text-slate-500">
            Status:{" "}
            <span className="font-medium text-slate-700">{batch.status}</span>
          </p>
        )}
      </div>
    </div>
  );
}

function formatBatchDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function EmptyPlaceholder({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

export default DashboardPage;
