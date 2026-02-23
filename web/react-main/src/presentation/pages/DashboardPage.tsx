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
  Bell,
  Clock,
  Download,
  AlertTriangle,
  Loader2,
  MapPin,
  Megaphone,
  Paperclip,
  Phone,
  Package,
  ShieldCheck,
  User,
  Sparkles,
  Zap,
  Send,
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
  message: string;
  category?: "distribution" | "event" | "audit" | "urgent" | string;
  createdAt?: string;
  attachmentUrl?: string | null;
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
  const batches = useMemo(
    () =>
      (data.batches ?? []).filter(
        (batch) => batch && (batch.code?.trim() || batch.id?.trim()),
      ),
    [data.batches],
  );

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
    <div className="relative min-h-screen overflow-hidden bg-[var(--light-neutral)] text-[var(--foreground)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(45,62,83,0.08),transparent_45%),radial-gradient(circle_at_82%_0%,rgba(27,42,65,0.12),transparent_40%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(27,42,65,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(27,42,65,0.06)_1px,transparent_1px)] bg-[size:32px_32px] opacity-50" />

      <header className="relative z-10 border-b border-[var(--border)] bg-white/75 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-6 py-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/80 px-3 py-1 text-xs uppercase tracking-[0.3em] text-[var(--muted-gray)]">
              <Sparkles className="h-3.5 w-3.5 text-[var(--accent-emerald)]" />
              Program Bansos Terpadu
            </div>
            <h1 className="text-2xl font-semibold text-[var(--deep-navy)] md:text-3xl">
              Dashboard Penerima Bantuan
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted-gray)]">
              <span className="rounded-full border border-[var(--border)] bg-white/80 px-3 py-1">
                ID Pengajuan: <span className="font-mono">{data.submissionId}</span>
              </span>
              <span className="rounded-full border border-[var(--border)] bg-white/80 px-3 py-1">
                Status: {status.label}
              </span>
              {data.submittedAt && (
                <span className="rounded-full border border-[var(--border)] bg-white/80 px-3 py-1">
                  Diajukan {data.submittedAt}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {onLogout && (
              <Button variant="ghost" className="btn-ghost" onClick={onLogout}>
                Keluar
              </Button>
            )}
            {onStartNew && (
              <Button variant="outline" className="btn-primary" onClick={onStartNew}>
                Ajukan Verifikasi Baru
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
        {(needsPin || pinSuccess) && (
          <section>
            <div
              className={`rounded-3xl border p-6 shadow-sm backdrop-blur ${
                needsPin
                  ? "border-amber-300 bg-amber-50/80"
                  : "border-emerald-200 bg-emerald-50/80"
              }`}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="max-w-xl space-y-2">
                  <p className="text-xs uppercase tracking-wide text-[var(--muted-gray)]">
                    Keamanan Akun
                  </p>
                  <h2 className="text-xl font-semibold text-[var(--deep-navy)]">
                    {needsPin
                      ? "Buat PIN 6 digit untuk mengamankan dashboard Anda"
                      : "PIN berhasil disimpan"}
                  </h2>
                  <p className="text-sm text-[var(--muted-gray)]">
                    {needsPin
                      ? "PIN digunakan bersama nomor HP untuk masuk kembali ke dashboard bansos. Wajib dibuat sebelum Anda keluar dari sesi ini."
                      : "Nomor HP Anda kini terlindungi PIN. Gunakan kombinasi tersebut untuk masuk kembali ke dashboard kapan pun diperlukan."}
                  </p>
                </div>
                {pinSuccess && !needsPin && (
                  <div className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-700">
                    ✅ PIN tersimpan. Simpan secara pribadi dan jangan bagikan kepada pihak lain.
                  </div>
                )}
              </div>
              {needsPin && (
                <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handlePinSubmit}>
                  <div className="space-y-2">
                    <Label htmlFor="pin-new">PIN (6 digit)</Label>
                    <Input
                      id="pin-new"
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="******"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
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
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                      required
                    />
                  </div>
                  <div className="md:col-span-2 space-y-3">
                    {pinError && <p className="text-sm text-red-600">{pinError}</p>}
                    <Button type="submit" className="w-full md:w-auto" disabled={pinSubmitting}>
                      {pinSubmitting ? "Menyimpan..." : "Simpan PIN Sekarang"}
                    </Button>
                    <p className="text-xs text-[var(--muted-gray)]">
                      Simpan PIN dengan aman. Petugas tidak pernah meminta PIN Anda.
                    </p>
                  </div>
                </form>
              )}
            </div>
          </section>
        )}

        {needsSurvey && (
          <section>
            <div className="rounded-3xl border border-indigo-300 bg-indigo-50/80 p-6 shadow-sm backdrop-blur">
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
            <Card className="shadow-sm border border-[var(--border)] bg-white/80 backdrop-blur">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">Status Survei Keluarga</CardTitle>
                    <CardDescription>
                      Terakhir dikirim {data.surveySubmittedAt ?? "-"}
                    </CardDescription>
                  </div>
                  <Badge variant={surveyStatus.variant}>{surveyStatus.label}</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-[var(--muted-gray)]">
                  Data survei akan digunakan petugas TKSK sebagai dasar evaluasi kelayakan bantuan sosial Anda.
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

        <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <Card className="shadow-sm border border-[var(--border)] bg-white/80 backdrop-blur">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-[var(--deep-navy)]">
                    Tahapan Penyaluran BANSOS
                  </CardTitle>
                  <CardDescription className="text-[var(--muted-gray)]">
                    Pantau progres setiap langkah hingga bantuan diterima.
                  </CardDescription>
                </div>
                <Badge variant={status.variant} className={`${status.className ?? ""} px-3 py-1`}>
                  {status.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-2xl border border-[var(--border)] bg-white/70 p-4">
                <div className="flex items-center gap-3">
                  <Progress value={completion} className="h-2 flex-1" />
                  <span className="text-sm font-medium text-[var(--deep-navy)]">
                    {completion}%
                  </span>
                </div>
                <p className="mt-3 text-xs uppercase tracking-wide text-[var(--muted-gray)]">
                  Progress keseluruhan
                </p>
              </div>
              <ul className="space-y-3 text-sm">
                {stageItems.map((stage, index) => (
                  <li
                    key={stage.label}
                    className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] bg-white text-xs font-semibold text-[var(--muted-gray)]">
                      {index + 1}
                    </span>
                    <CheckCircle2
                      className={`h-4 w-4 ${
                        stage.done ? "text-[var(--accent-emerald)]" : "text-slate-300"
                      }`}
                    />
                    <span className="font-medium text-[var(--deep-navy)]">{stage.label}</span>
                    <span className="ml-auto text-xs text-[var(--muted-gray)] text-right">
                      {stage.description}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <Card className="border border-[var(--border)] bg-white/80 shadow-sm backdrop-blur">
              <CardHeader>
                <CardTitle className="text-[var(--deep-navy)]">Ringkasan Status</CardTitle>
                <CardDescription className="text-[var(--muted-gray)]">
                  Pusat pantau kondisi akun Anda.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  {
                    label: "Identitas",
                    value: identityComplete ? "Terverifikasi" : "Menunggu",
                    tone: identityComplete ? "text-emerald-700" : "text-amber-700",
                  },
                  {
                    label: "Survei",
                    value: surveyComplete ? "Lengkap" : "Belum",
                    tone: surveyComplete ? "text-emerald-700" : "text-amber-700",
                  },
                  {
                    label: "Penyaluran",
                    value: disbursementComplete
                      ? "Disalurkan"
                      : disbursementState === "sedang disalurkan"
                        ? "Diproses"
                        : "Antrian",
                    tone:
                      disbursementState === "disalurkan"
                        ? "text-emerald-700"
                        : "text-amber-700",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3"
                  >
                    <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted-gray)]">
                      {item.label}
                    </span>
                    <span className={`text-sm font-semibold ${item.tone}`}>{item.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border border-[var(--border)] bg-white/80 shadow-sm backdrop-blur">
              <CardHeader>
                <CardTitle className="text-[var(--deep-navy)]">Ringkasan Pemohon</CardTitle>
                <CardDescription className="text-[var(--muted-gray)]">
                  Data diisi saat verifikasi.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-[var(--muted-gray)]">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="font-medium text-[var(--deep-navy)]">
                    {data.applicant.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  <span>{maskNik(data.applicant.number)}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5" />
                  <span>{data.applicant.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>{data.applicant.phone}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="shadow-sm border border-[var(--border)] bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-[var(--deep-navy)]">Jadwal Penyaluran</CardTitle>
              <CardDescription className="text-[var(--muted-gray)]">
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

          <Card className="shadow-sm border border-[var(--border)] bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-[var(--deep-navy)]">Notifikasi Penting</CardTitle>
              <CardDescription className="text-[var(--muted-gray)]">
                Pemberitahuan terbaru terkait pengajuan Anda.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-[var(--muted-gray)]">
              {notifications.length === 0 ? (
                <EmptyPlaceholder message="Belum ada notifikasi penting. Kami akan menampilkan kabar terbaru begitu ada pembaruan dari petugas." />
              ) : (
                notifications.map((item) => (
                  <NotificationItem
                    key={item.id ?? `${item.message}-${item.createdAt ?? "time"}`}
                    item={item}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="shadow-sm border border-[var(--border)] bg-white/80 backdrop-blur row-span-2">
            <CardHeader>
              <CardTitle className="text-[var(--deep-navy)]">
                Pintasan Hubungi Admin
              </CardTitle>
              <CardDescription className="text-[var(--muted-gray)]">
                Kirim pesan cepat ke petugas jika kamu ada kendala.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-[var(--muted-gray)]">
              <div className="space-y-2 max-h-80 min-h-[260px] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--section-neutral)]/40 p-3">
                <ChatBubble
                  sender="Anda"
                  tone="user"
                  message="Halo Kak, saya mau konfirmasi jadwal penyaluran terbaru ya."
                  time="09:10"
                />
                <ChatBubble
                  sender="Admin"
                  tone="admin"
                  message="Halo! Jadwal Anda di Batam Kota tanggal 11 Desember, pukul 09.30. Silakan bawa KTP asli."
                  time="09:12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chat-message">Tulis pesan</Label>
                <textarea
                  id="chat-message"
                  rows={3}
                  className="w-full input-surface"
                  placeholder="Contoh: Apakah perlu membawa KK saat penyaluran?"
                />
                <div className="flex justify-end">
                  <Button className="btn-primary">
                    <Send className="h-4 w-4 mr-2" />
                    Kirim Pesan
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <Card className="border border-[var(--border)] bg-white/80 shadow-sm backdrop-blur">
              <CardHeader>
                <CardTitle className="text-[var(--deep-navy)]">Kelompok Bantuan</CardTitle>
                <CardDescription className="text-[var(--muted-gray)]">
                  Batch penyaluran yang telah ditetapkan.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {batches.length === 0 ? (
                  <div className="space-y-3 text-sm text-[var(--muted-gray)]">
                    <p className="font-semibold text-[var(--deep-navy)]">
                      Belum ada distribusi untuk akun Anda.
                    </p>
                    <p>
                      Petugas akan menetapkan kelompok penyaluran setelah data Anda lolos verifikasi. Jika status sudah disetujui tapi belum ada distribusi, silakan hubungi admin melalui fitur chat.
                    </p>
                    <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--section-neutral)]/60 p-3 text-xs">
                      Terakhir diperiksa: <span className="font-semibold">Belum tersedia</span>
                    </div>
                  </div>
                ) : (
                  batches.map((batch) => <BatchItem key={batch.id} batch={batch} />)
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-[var(--border)] bg-white/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-[var(--deep-navy)]">Rekening Penyaluran</CardTitle>
                <CardDescription className="text-[var(--muted-gray)]">
                  Pastikan data bank sesuai untuk pencairan.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-[var(--muted-gray)]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[var(--muted-gray)]" />
                  <span>Bank Mandiri</span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditMask value={accountNumber} />
                </div>
                <p className="text-xs text-[var(--muted-gray)]">
                  Jika ingin mengubah rekening, hubungi petugas Dinas Sosial dengan membawa buku tabungan asli.
                </p>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Unduh Surat Kuasa
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-[var(--border)] bg-white/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-[var(--deep-navy)]">Pusat Bantuan</CardTitle>
                <CardDescription className="text-[var(--muted-gray)]">
                  Hubungi petugas jika ada kendala data.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-[var(--muted-gray)]">
                <p>
                  WhatsApp Hotline: <span className="font-medium">0811-222-3344</span>
                </p>
                <p>
                  Email: <span className="font-medium">layanan@dinsos.go.id</span>
                </p>
                <p>Jam Operasional: Senin–Jumat pukul 08.00–16.00 WIB</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm">
                    Kirim Pesan ke Petugas
                  </Button>
                  <Button variant="outline" size="sm">
                    <Phone className="h-4 w-4 mr-2" />
                    Telepon
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-[var(--border)] bg-white/80 p-6 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted-gray)]">
                  Akses Aman
                </p>
                <h3 className="mt-2 text-lg font-semibold text-[var(--deep-navy)]">
                  Verifikasi Berlapis
                </h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent-emerald)]/15 text-[var(--accent-emerald)]">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-sm text-[var(--muted-gray)]">
              Seluruh data terenkripsi dan diverifikasi berlapis untuk memastikan bantuan diterima oleh pihak yang tepat.
            </p>
          </div>
          <div className="rounded-3xl border border-[var(--border)] bg-white/80 p-6 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted-gray)]">
                  Pemantauan
                </p>
                <h3 className="mt-2 text-lg font-semibold text-[var(--deep-navy)]">
                  Update Real-time
                </h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent-emerald)]/15 text-[var(--accent-emerald)]">
                <Zap className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-sm text-[var(--muted-gray)]">
              Status pengajuan, survei, dan penyaluran ditampilkan langsung dari sistem pusat.
            </p>
          </div>
          <div className="rounded-3xl border border-[var(--border)] bg-white/80 p-6 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted-gray)]">
                  Bantuan Cepat
                </p>
                <h3 className="mt-2 text-lg font-semibold text-[var(--deep-navy)]">
                  Respon Prioritas
                </h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent-emerald)]/15 text-[var(--accent-emerald)]">
                <Send className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-sm text-[var(--muted-gray)]">
              Petugas akan menanggapi pertanyaan Anda melalui chat dalam jam operasional.
            </p>
          </div>
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
      className={`flex items-start gap-4 rounded-2xl border ${visuals.accent} p-4 shadow-[0_12px_30px_-20px_rgba(27,42,65,0.35)]`}
    >
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-full bg-white ${visuals.iconColor}`}
      >
        {visuals.icon}
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-[var(--deep-navy)]">{item.title}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${visuals.badgeClass}`}
          >
            {visuals.label}
          </span>
          {item.channel && (
            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--muted-gray)] border border-[var(--border)]">
              {formatChannel(item.channel)}
            </span>
          )}
          {item.batchCodes && item.batchCodes.length > 0 && (
            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] text-[var(--muted-gray)] border border-[var(--border)]">
              Batch: {item.batchCodes.join(", ")}
            </span>
          )}
        </div>
        {item.date && (
          <p className="text-xs text-[var(--muted-gray)] mt-2 flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" />
            {item.date}
          </p>
        )}
        {item.location && (
          <p className="text-xs text-[var(--muted-gray)] mt-1 flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5" />
            {item.location}
          </p>
        )}
        {item.note && <p className="text-xs text-[var(--muted-gray)] mt-1">{item.note}</p>}
        {item.updatedAt && (
          <p className="text-[11px] text-[var(--muted-gray)] mt-1">
            Diperbarui {item.updatedAt}
          </p>
        )}
      </div>
    </div>
  );
}

function NotificationItem({ item }: { item: DashboardNotification }) {
  const category = (item.category ?? "default").toLowerCase();
  const palette = notificationPalette[category] ?? notificationPalette.default;
  const Icon = palette.Icon;
  return (
    <div
      className={`rounded-2xl border p-4 shadow-[0_12px_24px_-18px_rgba(27,42,65,0.35)] ${palette.bg} ${palette.border}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${palette.badgeBg} ${palette.badgeText}`}
          >
            <Icon className="h-3.5 w-3.5" />
            {palette.label}
          </span>
        </div>
        {item.createdAt && (
          <span className="text-[11px] text-[var(--muted-gray)]">
            {formatNotificationTime(item.createdAt)}
          </span>
        )}
      </div>
      <p className={`mt-2 text-sm leading-relaxed ${palette.text}`}>{item.message}</p>
      {item.attachmentUrl && (
        <a
          href={item.attachmentUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[var(--deep-navy)] underline"
        >
          <Paperclip className="h-3.5 w-3.5" />
          Lihat lampiran
        </a>
      )}
    </div>
  );
}

function BatchItem({ batch }: { batch: PortalBatch }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-4 flex gap-3">
      <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
        <Package className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[var(--deep-navy)]">{batch.code}</p>
        <p className="text-xs text-[var(--muted-gray)]">Dibuat: {formatBatchDate(batch.createdAt)}</p>
        {batch.status && (
          <p className="text-xs text-[var(--muted-gray)]">
            Status: <span className="font-medium text-[var(--deep-navy)]">{batch.status}</span>
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

const notificationPalette: Record<
  string,
  {
    bg: string;
    border: string;
    text: string;
    badgeBg: string;
    badgeText: string;
    label: string;
    Icon: typeof Bell;
  }
> = {
  distribution: {
    bg: "bg-blue-50",
    border: "border-blue-100",
    text: "text-slate-800",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-700",
    label: "Penyaluran",
    Icon: Megaphone,
  },
  event: {
    bg: "bg-amber-50",
    border: "border-amber-100",
    text: "text-amber-900",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-700",
    label: "Jadwal",
    Icon: Calendar,
  },
  audit: {
    bg: "bg-purple-50",
    border: "border-purple-100",
    text: "text-purple-900",
    badgeBg: "bg-purple-100",
    badgeText: "text-purple-700",
    label: "Audit",
    Icon: ShieldCheck,
  },
  urgent: {
    bg: "bg-rose-50",
    border: "border-rose-100",
    text: "text-rose-900",
    badgeBg: "bg-rose-100",
    badgeText: "text-rose-700",
    label: "Penting",
    Icon: AlertTriangle,
  },
  default: {
    bg: "bg-slate-50",
    border: "border-slate-200",
    text: "text-slate-800",
    badgeBg: "bg-slate-200",
    badgeText: "text-slate-700",
    label: "Info",
    Icon: Bell,
  },
};

function formatNotificationTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function EmptyPlaceholder({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--section-neutral)]/50 p-4 text-center text-sm text-[var(--muted-gray)]">
      {message}
    </div>
  );
}

function ChatBubble({
  sender,
  message,
  time,
  tone = "user",
}: {
  sender: string;
  message: string;
  time?: string;
  tone?: "user" | "admin";
}) {
  const isUser = tone === "user";
  return (
    <div
      className={`flex flex-col gap-1 rounded-2xl px-3 py-2 ${
        isUser
          ? "bg-white border border-[var(--border)]"
          : "bg-[var(--accent-emerald)]/10 border border-[var(--accent-emerald)]/40"
      }`}
    >
      <div className="flex items-center justify-between text-xs font-semibold">
        <span
          className={
            isUser ? "text-[var(--deep-navy)]" : "text-[var(--accent-emerald)]"
          }
        >
          {sender}
        </span>
        {time && <span className="text-[var(--muted-gray)] font-normal">{time}</span>}
      </div>
      <p className="text-sm text-[var(--foreground)]">{message}</p>
    </div>
  );
}

export default DashboardPage;
