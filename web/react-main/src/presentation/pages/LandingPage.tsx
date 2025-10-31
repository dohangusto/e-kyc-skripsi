import { ShieldCheck, Smartphone, Clock, Users } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type LandingPageProps = {
  onStart: () => void;
  onViewDashboard?: () => void;
  hasSubmission?: boolean;
};

const highlights = [
  {
    icon: ShieldCheck,
    title: "Keamanan Terjamin",
    description: "Foto dan data hanya dipakai untuk verifikasi bansos dan dijaga oleh Dinas Sosial.",
  },
  {
    icon: Smartphone,
    title: "Proses dari Ponsel",
    description: "Gunakan kamera perangkat Anda untuk foto KTP, selfie, dan liveness check.",
  },
  {
    icon: Clock,
    title: "Bisa Lanjut Nanti",
    description: "Progress Anda tersimpan otomatis. Tutup halaman kapan saja dan kembali lagi.",
  },
  {
    icon: Users,
    title: "Pendampingan Petugas",
    description: "Verifikasi akhir dilakukan petugas dalam 1–2 hari kerja sebelum pencairan.",
  },
];

export function LandingPage({ onStart, onViewDashboard, hasSubmission }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white text-slate-900">
      <header className="border-b bg-white/80 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="uppercase tracking-wide text-xs">
                Program Bansos Terpadu
              </Badge>
              <span className="text-xs text-slate-500">Dinas Sosial Kabupaten/Kota</span>
            </div>
            <h1 className="text-xl font-semibold mt-1">Verifikasi Identitas Penerima Bantuan Sosial</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={onStart}>
              Mulai Verifikasi
            </Button>
            {hasSubmission && onViewDashboard && (
              <Button variant="outline" onClick={onViewDashboard}>
                Lihat Status Pengajuan
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
              Pastikan bantuan sosial tepat sasaran, dengan verifikasi identitas yang aman dan mudah.
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              Tahapan verifikasi mengikuti standar pemerintah: foto KTP, review data, selfie, liveness check, dan konfirmasi kontak.
              Semua langkah bisa dilakukan kurang dari 10 menit dari perangkat Anda.
            </p>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
              <p className="text-sm text-slate-600">
                <strong className="text-slate-800">Catatan:</strong> Data Anda akan diverifikasi oleh petugas dinas sosial dalam 1–2 hari kerja.
                Pastikan nomor HP aktif untuk menerima kabar lanjutan.
              </p>
              <p className="text-xs text-slate-500">
                Butuh bantuan? Hubungi pusat layanan Dinsos setempat di jam kerja.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={onStart}>
                Mulai Verifikasi Sekarang
              </Button>
              {hasSubmission && onViewDashboard ? (
                <Button size="lg" variant="outline" onClick={onViewDashboard}>
                  Lihat Status Pengajuan
                </Button>
              ) : (
                <Button size="lg" variant="outline">
                  Panduan Tahapan
                </Button>
              )}
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
                <p className="text-sm uppercase tracking-wide">Tahapan Verifikasi</p>
                <p className="text-lg font-semibold">Onboarding KYC Penerima Bansos</p>
              </div>
              <ol className="divide-y divide-slate-100">
                {[
                  "Ambil foto KTP dan verifikasi OCR",
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
                Seluruh proses mengikuti Pedoman Verifikasi Identitas Penerima Manfaat Bansos 2024.
              </div>
            </div>
          </motion.div>
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
                <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
              </div>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">{description}</p>
            </motion.div>
          ))}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-slate-900 text-white px-8 py-12 shadow-lg">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-wide text-emerald-200">Transparansi & Akuntabilitas</p>
              <h3 className="text-2xl font-semibold">Kenapa verifikasi digital ini penting?</h3>
              <p className="text-sm text-slate-200 leading-relaxed max-w-xl">
                Digital onboarding membantu memastikan bantuan sosial tepat sasaran,
                mengurangi duplikasi penerima, dan mempercepat proses evaluasi lapangan.
                Setiap permohonan tetap diverifikasi manual oleh petugas sebelum pencairan.
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-5 border border-white/10 space-y-3">
              <h4 className="text-sm font-semibold text-emerald-200">Dokumen Panduan</h4>
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
        </section>
      </main>

      <footer className="border-t bg-white">
        <div className="max-w-5xl mx-auto px-6 py-6 text-xs text-slate-500">
          &copy; {new Date().getFullYear()} Dinas Sosial Kabupaten/Kota. Semua hak dilindungi.
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
