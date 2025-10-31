import { useMemo } from "react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

import { Calendar, CheckCircle2, Clock, Download, MapPin, Phone, ShieldCheck, User } from "lucide-react";

import type { Applicant } from "@domain/types";

type VerificationStatus = "SEDANG_DITINJAU" | "DISETUJUI" | "DITOLAK";

export type DashboardData = {
  submissionId: string;
  applicant: Applicant;
  verificationStatus: VerificationStatus;
  faceMatchPassed: boolean;
  livenessPassed: boolean;
  submittedAt?: string;
};

type DashboardPageProps = {
  data: DashboardData;
  onStartNew?: () => void;
};

const scheduleSamples = [
  {
    title: "Verifikasi Lapangan",
    date: "12 Maret 2025",
    location: "Kel. Cempaka Putih, Jakarta Pusat",
  },
  {
    title: "Rapat Penetapan Penerima",
    date: "18 Maret 2025",
    location: "Dinas Sosial Kota",
  },
  {
    title: "Penyaluran Tahap I",
    date: "22 Maret 2025",
    location: "Kantor POS Cempaka Putih",
  },
];

function maskNik(nik?: string) {
  if (!nik) return "-";
  return nik.replace(/^(\d{4})\d{8}(\d{4})$/, (_match, prefix, suffix) => `${prefix}••••••••${suffix}`);
}

type BadgeStyle = {
  variant: "default" | "secondary" | "destructive" | "outline";
  className?: string;
};

function formatStatus(status: VerificationStatus): BadgeStyle & { label: string } {
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

export function DashboardPage({ data, onStartNew }: DashboardPageProps) {
  const status = useMemo(() => formatStatus(data.verificationStatus), [data.verificationStatus]);
  const completion = useMemo(() => {
    const steps = [
      data.faceMatchPassed,
      data.livenessPassed,
      data.verificationStatus === "DISETUJUI",
    ];
    const value = (steps.filter(Boolean).length / steps.length) * 100;
    return Math.round(value);
  }, [data.faceMatchPassed, data.livenessPassed, data.verificationStatus]);
  const accountNumber = useMemo(() => {
    const digits = data.applicant.phone?.replace(/\D/g, "") ?? "";
    if (digits.length >= 8) return `62${digits.slice(-8)}`;
    return "620001234567";
  }, [data.applicant.phone]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white text-slate-900">
      <header className="border-b bg-white/90 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Program Bansos Terpadu</p>
            <h1 className="text-2xl font-semibold">Dashboard Penerima Bantuan</h1>
            <p className="text-sm text-slate-500 mt-1">
              ID Pengajuan: <span className="font-mono">{data.submissionId}</span>
            </p>
          </div>
          {onStartNew && (
            <Button variant="outline" onClick={onStartNew}>
              Ajukan Verifikasi Baru
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        <section className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 shadow-sm">
            <CardHeader>
              <CardTitle>Status Verifikasi</CardTitle>
              <CardDescription>
                Proses validasi identitas oleh petugas Dinas Sosial.
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
                <p className="text-xs uppercase tracking-wide text-slate-500">Progress</p>
                <div className="flex items-center gap-3 mt-2">
                  <Progress value={completion} className="h-2" />
                  <span className="text-sm font-medium text-slate-700">{completion}%</span>
                </div>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className={`h-4 w-4 ${data.faceMatchPassed ? "text-emerald-500" : "text-slate-300"}`} />
                    Pencocokan wajah
                    <span className="ml-auto text-xs text-slate-400">{data.faceMatchPassed ? "Lulus" : "Menunggu"}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className={`h-4 w-4 ${data.livenessPassed ? "text-emerald-500" : "text-slate-300"}`} />
                    Liveness check
                    <span className="ml-auto text-xs text-slate-400">{data.livenessPassed ? "Lulus" : "Menunggu"}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className={`h-4 w-4 ${data.verificationStatus === "DISETUJUI" ? "text-emerald-500" : "text-slate-300"}`} />
                    Persetujuan petugas
                    <span className="ml-auto text-xs text-slate-400">
                      {data.verificationStatus === "DISETUJUI" ? "Disetujui" : "Dalam proses"}
                    </span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Ringkasan Pemohon</CardTitle>
              <CardDescription>Data diambil dari hasil OCR dan input manual.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-400" />
                <span className="font-medium text-slate-800">{data.applicant.name}</span>
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
              <CardDescription>Informasi tahap penyaluran bantuan untuk wilayah Anda.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {scheduleSamples.map((item) => (
                <div key={item.title} className="flex items-start gap-4 rounded-xl border border-slate-100 bg-white p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      {item.date}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" />
                      {item.location}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Rekening Penyaluran</CardTitle>
              <CardDescription>Pastikan data bank sesuai untuk pencairan.</CardDescription>
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
                Jika ingin mengubah rekening, hubungi petugas Dinas Sosial dengan membawa buku tabungan asli.
              </p>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
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
              <CardDescription>Pemberitahuan terbaru terkait pengajuan Anda.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <NotificationItem
                title="Sedang dijadwalkan survei lapangan"
                time="Dikirim 10 Maret 2025"
              />
              <NotificationItem
                title="Dokumen selfie sudah divalidasi"
                time="Dikirim 8 Maret 2025"
              />
              <NotificationItem
                title="Pengajuan berhasil dikirim"
                time="Dikirim 7 Maret 2025"
              />
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Pusat Bantuan</CardTitle>
              <CardDescription>Hubungi petugas jika ada kendala data.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p>WhatsApp Hotline: <span className="font-medium">0811-222-3344</span></p>
              <p>Email: <span className="font-medium">layanan@dinsos.go.id</span></p>
              <p>Jam Operasional: Senin–Jumat pukul 08.00–16.00 WIB</p>
              <Button variant="secondary" size="sm">Kirim Pesan ke Petugas</Button>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}

function CreditMask({ value }: { value: string }) {
  const masked = value.replace(/.(?=.{4})/g, "•");
  return (
    <span className="font-mono tracking-wide">
      {masked}
    </span>
  );
}

function NotificationItem({ title, time }: { title: string; time: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4">
      <p className="font-medium text-slate-800">{title}</p>
      <p className="text-xs text-slate-500 mt-1">{time}</p>
    </div>
  );
}

export default DashboardPage;
