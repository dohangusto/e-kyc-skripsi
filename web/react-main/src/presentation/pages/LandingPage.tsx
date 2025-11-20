import { useEffect, useState, type FormEvent } from "react";
import {
  ShieldCheck,
  Smartphone,
  Clock,
  Users,
  MessageCircleMore,
} from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LandingPageProps = {
  onStart: () => void;
  onViewDashboard?: () => void;
  onLogin?: (payload: { phone: string; pin: string }) => void | Promise<void>;
  hasSubmission?: boolean;
  pinError?: string | null;
  canAccessDashboard?: boolean;
  onRequestOtp?: (phone: string) => { phone: string; code: string } | null;
  onVerifyOtp?: (payload: { phone: string; code: string }) => void;
  otpError?: string | null;
  otpInfo?: { phone: string; code: string } | null;
};

const highlights = [
  {
    icon: ShieldCheck,
    title: "Keamanan Terjamin",
    description:
      "Foto dan data hanya dipakai untuk verifikasi bansos dan dijaga oleh Dinas Sosial.",
  },
  {
    icon: Smartphone,
    title: "Proses dari Ponsel",
    description:
      "Gunakan kamera perangkat Anda untuk foto KTP, selfie, dan liveness check.",
  },
  {
    icon: Clock,
    title: "Bisa Lanjut Nanti",
    description:
      "Progress Anda tersimpan otomatis. Tutup halaman kapan saja dan kembali lagi.",
  },
  {
    icon: Users,
    title: "Pendampingan Petugas",
    description:
      "Verifikasi akhir dilakukan petugas dalam 1–2 hari kerja sebelum pencairan.",
  },
];

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 4) return digits || "-";
  const visible = digits.slice(-4);
  return `****${visible}`;
}

export function LandingPage({
  onStart,
  onViewDashboard,
  onLogin,
  hasSubmission,
  pinError,
  canAccessDashboard,
  onRequestOtp,
  onVerifyOtp,
  otpError,
  otpInfo,
}: LandingPageProps) {
  const [pinPhone, setPinPhone] = useState("");
  const [pinValue, setPinValue] = useState("");
  const [pinSubmitting, setPinSubmitting] = useState(false);

  const [otpPhone, setOtpPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpMessage, setOtpMessage] = useState<string | null>(null);

  useEffect(() => {
    if (otpInfo) {
      setOtpMessage(
        `OTP untuk ${maskPhone(otpInfo.phone)} (simulasi): ${otpInfo.code}`,
      );
      setOtpCode(otpInfo.code);
    } else {
      setOtpMessage(null);
    }
  }, [otpInfo]);

  async function handlePinLogin(e: FormEvent) {
    e.preventDefault();
    if (!onLogin) return;
    try {
      setPinSubmitting(true);
      await onLogin({ phone: pinPhone, pin: pinValue });
    } catch {
      // parent handler already surface errors via props
    } finally {
      setPinSubmitting(false);
    }
  }

  function handleRequestOtp() {
    if (!onRequestOtp) return;
    const res = onRequestOtp(otpPhone);
    if (res) {
      setOtpMessage(
        `OTP untuk ${maskPhone(res.phone)} (simulasi): ${res.code}`,
      );
      setOtpCode(res.code);
    }
  }

  function handleOtpSubmit(e: FormEvent) {
    e.preventDefault();
    onVerifyOtp?.({ phone: otpPhone, code: otpCode });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white text-slate-900">
      <header className="border-b bg-white/80 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className="uppercase tracking-wide text-xs"
              >
                Program Bansos Terpadu
              </Badge>
              <span className="text-xs text-slate-500">
                Dinas Sosial Kabupaten/Kota
              </span>
            </div>
            <h1 className="text-xl font-semibold mt-1">
              Verifikasi Identitas Penerima Bantuan Sosial
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={onStart}>
              Mulai Verifikasi
            </Button>
            {onViewDashboard && (
              <Button
                variant="outline"
                onClick={onViewDashboard}
                disabled={!canAccessDashboard}
              >
                {canAccessDashboard
                  ? "Masuk / Lanjut ke Dashboard"
                  : "Sudah punya akun? Login di bawah"}
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16 space-y-20">
        <section className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            <h2 className="text-3xl md:text-4xl font-bold leading-tight text-slate-900">
              Pastikan bantuan sosial tepat sasaran, dengan verifikasi identitas
              yang aman dan mudah.
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              Tahapan verifikasi mengikuti standar pemerintah: foto KTP, review
              data, selfie, liveness check, dan konfirmasi kontak. Semua langkah
              bisa dilakukan kurang dari 10 menit dari perangkat Anda.
            </p>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
              <p className="text-sm text-slate-600">
                <strong className="text-slate-800">Catatan:</strong> Data Anda
                akan diverifikasi oleh petugas dinas sosial dalam 1–2 hari
                kerja. Pastikan nomor HP aktif untuk menerima kabar lanjutan.
              </p>
              <p className="text-xs text-slate-500">
                Butuh bantuan? Hubungi pusat layanan Dinsos setempat di jam
                kerja.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={onStart}>
                Mulai Verifikasi Sekarang
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={onViewDashboard}
                disabled={!canAccessDashboard}
              >
                {canAccessDashboard
                  ? "Masuk / Lanjut ke Dashboard"
                  : "Sudah punya akun? Login di bawah"}
              </Button>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative"
          >
            <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-emerald-100 via-emerald-50 to-white blur-2xl" />
            <div className="relative rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden">
              <div className="bg-emerald-600 text-white px-6 py-4">
                <p className="text-sm uppercase tracking-wide">
                  Tahapan Verifikasi
                </p>
                <p className="text-lg font-semibold">
                  Onboarding KYC Penerima Bansos
                </p>
              </div>
              <ol className="divide-y divide-slate-100">
                {[
                  "Ambil foto KTP lalu isi data KTP secara manual",
                  "Selfie sambil memegang KTP",
                  "Liveness check untuk pastikan keaslian",
                  "Isi kontak dan kirim untuk review petugas",
                ].map((item, idx) => (
                  <li key={item} className="flex items-start gap-4 px-6 py-4">
                    <span className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold">
                      {idx + 1}
                    </span>
                    <span className="text-sm text-slate-700">{item}</span>
                  </li>
                ))}
              </ol>
              <div className="px-6 py-4 bg-slate-50 text-xs text-slate-500">
                Seluruh proses mengikuti Pedoman Verifikasi Identitas Penerima
                Manfaat Bansos 2024.
              </div>
            </div>
          </motion.div>
        </section>

        <section className="grid lg:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.3 }}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
          >
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Login dengan PIN
              </p>
              <h3 className="text-lg font-semibold text-slate-900">
                Gunakan Nomor HP &amp; PIN
              </h3>
              <p className="text-sm text-slate-600">
                Jika sudah menyelesaikan verifikasi dan membuat PIN di
                dashboard, masukkan nomor HP dan PIN 6 digit untuk melihat
                status bansos.
              </p>
            </div>
            <form className="space-y-4" onSubmit={handlePinLogin}>
              <div className="space-y-2">
                <Label htmlFor="login-phone">Nomor HP</Label>
                <Input
                  id="login-phone"
                  inputMode="tel"
                  placeholder="08xxxxxxxxxx"
                  value={pinPhone}
                  onChange={(e) => setPinPhone(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-pin">PIN (6 digit)</Label>
                <Input
                  id="login-pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="******"
                  value={pinValue}
                  onChange={(e) =>
                    setPinValue(e.target.value.replace(/\D/g, ""))
                  }
                  required
                />
              </div>
              {pinError && <p className="text-sm text-red-600">{pinError}</p>}
              <Button type="submit" className="w-full" disabled={pinSubmitting}>
                {pinSubmitting ? "Memproses..." : "Masuk dengan PIN"}
              </Button>
            </form>
            <div className="text-xs text-slate-500">
              Belum membuat PIN? Masuk dengan opsi OTP di samping, lalu atur PIN
              dari dashboard.
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
          >
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Login tanpa PIN
              </p>
              <h3 className="text-lg font-semibold text-slate-900">
                Simulasi OTP ke Nomor HP
              </h3>
              <p className="text-sm text-slate-600">
                Gunakan opsi ini bila Anda belum sempat membuat PIN. Masukkan
                nomor HP untuk menerima kode OTP (ditampilkan sebagai simulasi).
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp-phone">Nomor HP</Label>
                <Input
                  id="otp-phone"
                  inputMode="tel"
                  placeholder="08xxxxxxxxxx"
                  value={otpPhone}
                  onChange={(e) => setOtpPhone(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRequestOtp}
                >
                  Kirim OTP
                </Button>
                {otpMessage && (
                  <div className="flex items-center gap-2 text-xs text-emerald-600">
                    <MessageCircleMore className="h-3.5 w-3.5" /> {otpMessage}
                  </div>
                )}
              </div>
              <form className="space-y-3" onSubmit={handleOtpSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="otp-code">Masukkan OTP</Label>
                  <Input
                    id="otp-code"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="******"
                    value={otpCode}
                    onChange={(e) =>
                      setOtpCode(e.target.value.replace(/\D/g, ""))
                    }
                    required
                  />
                </div>
                {otpError && <p className="text-sm text-red-600">{otpError}</p>}
                <Button type="submit" className="w-full">
                  Masuk dengan OTP
                </Button>
              </form>
            </div>
          </motion.div>

          {hasSubmission && (
            <div className="lg:col-span-2 text-xs text-slate-500 px-2">
              Sistem mendeteksi pengajuan sebelumnya. Anda bisa masuk dengan PIN
              yang sudah dibuat, atau gunakan OTP di atas bila belum sempat
              menyetel PIN.
            </div>
          )}
        </section>

        <section className="grid md:grid-cols-2 gap-6">
          {highlights.map(({ icon: Icon, title, description }) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.3 }}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {title}
                </h3>
              </div>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                {description}
              </p>
            </motion.div>
          ))}
        </section>

        <section className="grid md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.3 }}
            className="rounded-3xl border border-slate-200 bg-slate-900 text-white px-8 py-12 shadow-lg md:col-span-2"
          >
            <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
              <div className="space-y-3">
                <p className="text-sm uppercase tracking-wide text-emerald-200">
                  Transparansi &amp; Akuntabilitas
                </p>
                <h3 className="text-2xl font-semibold">
                  Kenapa verifikasi digital ini penting?
                </h3>
                <p className="text-sm text-slate-200 leading-relaxed max-w-xl">
                  Digital onboarding membantu memastikan bantuan sosial tepat
                  sasaran, mengurangi duplikasi penerima, dan mempercepat proses
                  evaluasi lapangan. Setiap permohonan tetap diverifikasi manual
                  oleh petugas sebelum pencairan.
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 p-5 border border-white/10 space-y-3">
                <h4 className="text-sm font-semibold text-emerald-200">
                  Dokumen Panduan
                </h4>
                <ul className="text-xs text-slate-200 space-y-2">
                  <li>• Pedoman Verifikasi Penerima Bansos 2024</li>
                  <li>• SOP Perlindungan Data Pribadi Dinas Sosial</li>
                  <li>• Formulir Pernyataan Keabsahan Data</li>
                </ul>
                <Button size="sm" variant="secondary" className="w-full">
                  Unduh Surat Edaran
                </Button>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="border-t bg-white">
        <div className="max-w-5xl mx-auto px-6 py-6 text-xs text-slate-500">
          &copy; {new Date().getFullYear()} Dinas Sosial Kabupaten/Kota. Semua
          hak dilindungi.
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
