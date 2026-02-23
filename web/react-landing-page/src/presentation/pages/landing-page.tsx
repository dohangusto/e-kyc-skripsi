import { useEffect, useState } from "react";
import {
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  DownloadCloud,
  IdCard,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserCheck,
} from "lucide-react";

const stats = [
  { value: "5 Menit", label: "rata-rata proses verifikasi" },
  { value: "24/7", label: "bantuan tersedia di aplikasi" },
  { value: "100%", label: "data terenkripsi end-to-end" },
  { value: "Batubara", label: "fokus warga kabupaten" },
];

const steps = [
  {
    title: "Install aplikasi resmi",
    description:
      "Cari aplikasi “Bansos Batubara” di Play Store atau App Store, lalu masuk dengan nomor HP aktif.",
  },
  {
    title: "Lengkapi data dasar",
    description:
      "Masukkan NIK dan nomor KK dengan benar agar sistem menemukan profil Anda secara cepat.",
  },
  {
    title: "Unggah KTP & swafoto",
    description: "Ikuti panduan kamera untuk memotret KTP dan swafoto demi keamanan.",
  },
  {
    title: "Tunggu verifikasi",
    description:
      "Tim kami memvalidasi data, dan status akan muncul di aplikasi dalam hitungan jam.",
  },
];

const features = [
  {
    title: "Notifikasi real-time",
    description: "Dapatkan pengingat otomatis agar tidak melewatkan jadwal verifikasi.",
  },
  {
    title: "Panduan visual",
    description: "Langkah demi langkah dengan ilustrasi agar mudah diikuti semua usia.",
  },
  {
    title: "Bebas antre",
    description: "Verifikasi dari rumah tanpa perlu datang ke kantor desa.",
  },
  {
    title: "Pusat bantuan cerdas",
    description: "Chat bantuan cepat untuk menjawab kendala verifikasi.",
  },
];

const assurances = [
  {
    title: "Data aman & resmi",
    description:
      "Data hanya digunakan untuk verifikasi bansos, mengikuti standar keamanan pemerintah.",
  },
  {
    title: "Terhubung dengan dinas",
    description: "Aplikasi terintegrasi dengan sistem Dinas Sosial Kabupaten Batubara.",
  },
  {
    title: "Tanpa biaya",
    description: "Semua layanan verifikasi identitas gratis untuk warga Batubara.",
  },
];

const testimonials = [
  {
    name: "Ibu Ratna · Lima Puluh",
    quote: "Tidak perlu ke kantor desa lagi. Verifikasi selesai pagi, sorenya sudah disetujui.",
  },
  {
    name: "Pak Joko · Tanjung Tiram",
    quote:
      "Panduan aplikasinya jelas, tinggal ikuti langkahnya. Mudah untuk orang tua seperti saya.",
  },
  {
    name: "Siti · Medang Deras",
    quote: "Cepat dan aman. Ada notifikasi kalau ada dokumen yang kurang.",
  },
];

const faqs = [
  {
    question: "Siapa yang wajib verifikasi lewat aplikasi?",
    answer:
      "Semua calon penerima bantuan sosial Kabupaten Batubara diwajibkan melakukan verifikasi identitas agar bantuan tepat sasaran.",
    tag: "Kebijakan",
    meta: "Berlaku untuk calon penerima bansos",
    tip: "Pastikan nomor HP aktif agar notifikasi verifikasi masuk.",
    icon: ShieldCheck,
  },
  {
    question: "Apakah saya harus datang ke kantor?",
    answer:
      "Tidak. Seluruh proses dapat dilakukan dari smartphone. Jika ada kendala khusus, petugas akan menghubungi Anda.",
    tag: "Proses",
    meta: "Verifikasi dari rumah",
    tip: "Siapkan KTP dan pencahayaan yang cukup sebelum mulai.",
    icon: Smartphone,
  },
  {
    question: "Bagaimana jika data saya salah?",
    answer:
      "Anda bisa memperbarui data langsung di aplikasi dan mengunggah ulang dokumen tanpa biaya tambahan.",
    tag: "Perbaikan",
    meta: "Bisa diperbarui kapan saja",
    tip: "Gunakan foto yang jelas agar verifikasi ulang lebih cepat.",
    icon: IdCard,
  },
  {
    question: "Apakah aplikasi tersedia untuk iPhone?",
    answer:
      "Ya. Aplikasi tersedia untuk Android dan iOS agar semua warga bisa melakukan verifikasi dengan mudah.",
    tag: "Akses Aplikasi",
    meta: "Android dan iOS tersedia",
    tip: "Unduh hanya dari toko resmi untuk keamanan data.",
    icon: UserCheck,
  },
];

const AppBadge = ({ label }: { label: string }) => {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-brand-700/15 bg-white px-4 py-3 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-brand-700/40 hover:shadow-lift">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
        <Smartphone className="h-5 w-5" />
      </div>
      <div className="text-left">
        <p className="text-xs uppercase tracking-wide text-brand-700/60">Unduh di</p>
        <p className="text-sm font-semibold text-brand-700">{label}</p>
      </div>
    </div>
  );
};

const SectionHeading = ({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) => {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 text-center">
      <span className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-700/60">
        {eyebrow}
      </span>
      <h2 className="text-3xl font-semibold text-brand-700 md:text-4xl">{title}</h2>
      <p className="text-base text-brand-700/70 md:text-lg">{description}</p>
    </div>
  );
};

export const LandingPage = () => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);

  const verificationSteps = [
    {
      title: "Input NIK & Nomor KK",
      description: "Sistem akan mencocokkan data Anda dengan database resmi secara otomatis.",
      icon: IdCard,
      badge: "2 menit",
      highlight: "Validasi cepat",
      detail: "Pastikan nomor aktif agar notifikasi status masuk ke aplikasi Anda.",
    },
    {
      title: "Unggah Foto KTP",
      description:
        "Foto harus jelas, terang, dan seluruh teks terbaca untuk menghindari penolakan.",
      icon: Camera,
      badge: "Panduan kamera",
      highlight: "Anti blur",
      detail: "Ikuti bingkai otomatis agar ukuran KTP pas dan rapi.",
    },
    {
      title: "Swafoto Verifikasi",
      description: "Pastikan wajah terlihat utuh tanpa penutup agar cocok dengan data KTP.",
      icon: UserCheck,
      badge: "Aman & terenkripsi",
      highlight: "Anti penyalahgunaan",
      detail: "Wajah Anda hanya dipakai untuk verifikasi bansos, bukan tujuan lain.",
    },
  ];

  useEffect(() => {
    if (isCarouselPaused) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % verificationSteps.length);
    }, 4000);

    return () => window.clearInterval(timer);
  }, [isCarouselPaused, verificationSteps.length]);

  const handlePrev = () => {
    setActiveSlide((prev) => (prev - 1 + verificationSteps.length) % verificationSteps.length);
  };

  const handleNext = () => {
    setActiveSlide((prev) => (prev + 1) % verificationSteps.length);
  };

  return (
    <div className="min-h-screen bg-brand-50 text-brand-700">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute -top-40 right-0 h-96 w-96 rounded-full bg-brand-500/30 blur-[140px]" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-brand-100/80 blur-[120px]" />

        <div className="relative mx-auto flex max-w-6xl flex-col gap-16 px-6 pb-20 pt-10 lg:px-10">
          <nav className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 text-brand-700 shadow-glow">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <p className="text-base font-semibold text-brand-700">Bansos Batubara</p>
                <p className="text-xs text-brand-700/60">Verifikasi Identitas Digital</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-brand-700/70">
              <a className="transition hover:text-brand-700" href="#benefit">
                Manfaat
              </a>
              <span className="text-brand-700/30">•</span>
              <a className="transition hover:text-brand-700" href="#langkah">
                Persiapan
              </a>
              <span className="text-brand-700/30">•</span>
              <a className="transition hover:text-brand-700" href="#cara">
                Cara Kerja
              </a>
              <span className="text-brand-700/30">•</span>
              <a className="transition hover:text-brand-700" href="#fitur">
                Fitur
              </a>
              <span className="text-brand-700/30">•</span>
              <a className="transition hover:text-brand-700" href="#faq">
                FAQ
              </a>
              <span className="hidden text-brand-700/30 md:inline">•</span>
              <a className="cta-button" href="#download">
                Verifikasi Sekarang
              </a>
            </div>
          </nav>

          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="flex flex-col gap-6">
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700/70">
                <ShieldCheck className="h-4 w-4 text-brand-500" />
                Resmi Pemkab Batubara
              </span>
              <h1 className="text-4xl font-semibold leading-tight text-brand-700 md:text-5xl">
                Verifikasi identitas sekarang, agar bantuan sosial Anda tidak tertunda.
              </h1>
              <p className="text-base text-brand-700/75 md:text-lg">
                Aplikasi mobile resmi Kabupaten Batubara memudahkan calon penerima bansos untuk
                verifikasi data dari rumah. Cepat, aman, dan terhubung langsung dengan Dinas Sosial.
              </p>
              <div className="flex flex-wrap gap-3">
                <a className="cta-button" href="#download">
                  <DownloadCloud className="h-4 w-4" />
                  Unduh Aplikasi
                </a>
                <a className="ghost-button" href="#cara">
                  Lihat Cara Verifikasi
                </a>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="glass-panel flex flex-col gap-2 rounded-2xl px-5 py-4"
                  >
                    <p className="text-2xl font-semibold text-brand-700">{stat.value}</p>
                    <p className="text-sm text-brand-700/60">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="absolute -top-10 right-10 h-24 w-24 rounded-full bg-brand-500/30 blur-2xl" />
              <div className="absolute bottom-8 left-6 h-16 w-16 rounded-full bg-brand-100/80 blur-xl" />

              <div className="glass-panel relative w-full max-w-sm rounded-[32px] p-6">
                <div className="flex flex-col gap-6">
                  <div className="rounded-3xl bg-gradient-to-br from-brand-700 to-[#1b2730] p-6 text-brand-50 shadow-lift">
                    <p className="text-xs uppercase tracking-[0.3em] text-brand-50/70">
                      Dashboard Warga
                    </p>
                    <h3 className="mt-4 text-2xl font-semibold">Mulai verifikasi identitas Anda</h3>
                    <p className="mt-3 text-sm text-brand-50/70">
                      Lengkapi data di aplikasi agar proses bansos berjalan lancar.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-brand-700/10 bg-white/80 px-4 py-4">
                    <p className="text-sm font-semibold text-brand-700">
                      Siap verifikasi hari ini?
                    </p>
                    <p className="mt-2 text-xs text-brand-700/60">
                      Lihat rangkaian langkah verifikasi di bagian “Langkah Verifikasi” untuk
                      panduan lengkap.
                    </p>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-6 right-0 hidden animate-float rounded-2xl bg-white px-4 py-3 text-xs font-semibold text-brand-700 shadow-lift md:flex">
                Petugas siap membantu 24/7
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative">
        <section
          id="langkah"
          className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16 lg:px-10"
        >
          <SectionHeading
            eyebrow="Persiapan"
            title="Siapkan data dan dokumen utama sebelum mulai verifikasi"
            description="Bagian ini merangkum persiapan penting agar proses verifikasi berjalan lancar dan cepat disetujui."
          />
          <div
            className="relative"
            onMouseEnter={() => setIsCarouselPaused(true)}
            onMouseLeave={() => setIsCarouselPaused(false)}
          >
            <div className="overflow-hidden rounded-[32px] border border-brand-700/10 bg-white/70 shadow-lift">
              <div
                className="flex transition-transform duration-700 ease-out"
                style={{ transform: `translateX(-${activeSlide * 100}%)` }}
              >
                {verificationSteps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.title} className="min-w-full p-6 md:p-10">
                      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-brand-700 to-[#1b2730] p-8 text-brand-50">
                        <div className="absolute right-6 top-6 h-24 w-24 rounded-full bg-brand-500/30 blur-[40px]" />
                        <div className="absolute bottom-4 left-10 h-16 w-16 rounded-full bg-brand-100/40 blur-[36px]" />
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/20 text-brand-50">
                              <Icon className="h-6 w-6" />
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-[0.3em] text-brand-50/60">
                                Langkah {index + 1}
                              </p>
                              <h3 className="text-2xl font-semibold">{step.title}</h3>
                            </div>
                          </div>
                          <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold">
                            {step.badge}
                          </span>
                        </div>
                        <p className="mt-6 text-base text-brand-50/80">{step.description}</p>
                        <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                          <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 text-sm">
                            <CheckCircle2 className="h-5 w-5 text-brand-500" />
                            <span>{step.highlight}</span>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-brand-50/70">
                            {step.detail}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-brand-700/20 bg-white/80 text-brand-700 transition duration-300 hover:-translate-y-0.5 hover:border-brand-700/40 hover:shadow-lift"
                  type="button"
                  onClick={handlePrev}
                  aria-label="Sebelumnya"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-brand-700/20 bg-white/80 text-brand-700 transition duration-300 hover:-translate-y-0.5 hover:border-brand-700/40 hover:shadow-lift"
                  type="button"
                  onClick={handleNext}
                  aria-label="Berikutnya"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
              <div className="flex flex-1 items-center justify-center gap-2">
                {verificationSteps.map((step, index) => (
                  <button
                    key={step.title}
                    type="button"
                    onClick={() => setActiveSlide(index)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      activeSlide === index ? "w-10 bg-brand-500" : "w-4 bg-brand-700/20"
                    }`}
                    aria-label={`Lihat ${step.title}`}
                  />
                ))}
              </div>
              <div className="hidden items-center gap-2 text-xs text-brand-700/60 md:flex">
                <span className="h-2 w-2 rounded-full bg-brand-500 animate-pulseSoft" />
              </div>
            </div>
          </div>
        </section>

        <section
          id="benefit"
          className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16 lg:px-10"
        >
          <SectionHeading
            eyebrow="Manfaat Utama"
            title="Verifikasi digital yang cepat, aman, dan nyaman"
            description="Semua calon penerima bansos Kabupaten Batubara dapat memverifikasi identitas tanpa antre. Aplikasi ini memastikan bantuan tepat sasaran dan pencairan lebih lancar."
          />
          <div className="grid gap-6 md:grid-cols-3">
            {assurances.map((item) => (
              <div
                key={item.title}
                className="glass-panel flex h-full flex-col gap-4 rounded-3xl px-6 py-6 transition duration-300 hover:-translate-y-1 hover:shadow-lift"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/20 text-brand-700">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-brand-700">{item.title}</h3>
                <p className="text-sm text-brand-700/70">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="cara" className="bg-white/70">
          <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-20 lg:px-10">
            <SectionHeading
              eyebrow="Cara Kerja"
              title="Cukup 4 langkah untuk verifikasi"
              description="Ikuti panduan aplikasi agar identitas terverifikasi dengan benar dan bantuan segera diproses."
            />
            <div className="grid gap-6 md:grid-cols-2">
              {steps.map((step, index) => (
                <div key={step.title} className="glass-panel flex gap-5 rounded-3xl px-6 py-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 text-brand-700 font-semibold">
                    {index + 1}
                  </div>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-semibold text-brand-700">{step.title}</h3>
                    <p className="text-sm text-brand-700/70">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="fitur" className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-20 lg:px-10">
          <SectionHeading
            eyebrow="Fitur Unggulan"
            title="Dirancang untuk memudahkan warga Batubara"
            description="Setiap fitur dibuat agar proses verifikasi mudah diikuti dan terasa aman untuk semua kalangan."
          />
          <div className="grid gap-6 md:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="glass-panel flex h-full flex-col gap-4 rounded-3xl px-6 py-6 transition duration-300 hover:-translate-y-1 hover:shadow-lift"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-700 text-brand-50">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-brand-700">{feature.title}</h3>
                <p className="text-sm text-brand-700/70">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-brand-700 text-brand-50">
          <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-20 lg:px-10">
            <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="flex flex-col gap-5">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-50/70">
                  Kenapa Harus Sekarang
                </p>
                <h2 className="text-3xl font-semibold md:text-4xl">
                  Bantuan sosial hanya diberikan kepada warga yang sudah terverifikasi.
                </h2>
                <p className="text-base text-brand-50/70">
                  Jangan menunggu hingga data Anda tertunda. Verifikasi sekarang agar pencairan
                  bansos berjalan lancar.
                </p>
                <div className="flex flex-wrap gap-3">
                  <a className="cta-button" href="#download">
                    Mulai Verifikasi
                  </a>
                  <a className="ghost-button" href="#faq">
                    Tanya Jawab
                  </a>
                </div>
              </div>
              <div className="grid gap-4">
                {testimonials.map((item) => (
                  <div
                    key={item.name}
                    className="rounded-3xl border border-white/10 bg-white/10 px-5 py-4"
                  >
                    <p className="text-sm text-brand-50/80">“{item.quote}”</p>
                    <p className="mt-3 text-xs font-semibold text-brand-50/70">{item.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="relative overflow-hidden">
          <div className="absolute inset-0 bg-grid opacity-20" />
          <div className="absolute -top-24 right-0 h-80 w-80 rounded-full bg-brand-500/20 blur-[140px]" />
          <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-brand-100/80 blur-[120px]" />
          <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-6 py-20 lg:px-10">
            <SectionHeading
              eyebrow="FAQ"
              title="Pertanyaan yang sering diajukan"
              description="Jika masih ragu, lihat jawaban singkat di bawah ini."
            />
            <div className="grid gap-8 lg:grid-cols-[0.42fr_0.58fr] lg:items-start">
              <div className="glass-panel relative overflow-hidden rounded-[32px] px-6 py-8">
                <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-brand-500/20 blur-2xl" />
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-700 text-brand-50 shadow-glow">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-700/60">
                      Bantuan Cepat
                    </p>
                    <h3 className="text-2xl font-semibold text-brand-700">
                      Jawaban ringkas, jelas, dan resmi.
                    </h3>
                  </div>
                </div>
                <p className="mt-4 text-sm text-brand-700/70">
                  FAQ ini merangkum pertanyaan yang paling sering ditanyakan warga. Jika masih
                  bingung, hubungi kanal resmi di bagian bawah halaman.
                </p>
                <div className="mt-6 grid gap-3">
                  <div className="flex items-center gap-3 rounded-2xl border border-brand-700/10 bg-white/80 px-4 py-3 text-sm text-brand-700/70">
                    <ShieldCheck className="h-4 w-4 text-brand-500" />
                    <span>Jawaban mengacu pada panduan resmi Dinas Sosial.</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl border border-brand-700/10 bg-white/80 px-4 py-3 text-sm text-brand-700/70">
                    <CheckCircle2 className="h-4 w-4 text-brand-500" />
                    <span>Proses verifikasi bisa dilakukan langsung dari rumah.</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl border border-brand-700/10 bg-white/80 px-4 py-3 text-sm text-brand-700/70">
                    <Smartphone className="h-4 w-4 text-brand-500" />
                    <span>Bantuan di aplikasi tersedia kapan pun dibutuhkan.</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                {faqs.map((faq) => {
                  const Icon = faq.icon;
                  return (
                    <details
                      key={faq.question}
                      className="group relative overflow-hidden rounded-3xl border border-brand-700/10 bg-white/80 px-6 py-5 transition duration-300 hover:-translate-y-0.5 hover:border-brand-700/30 hover:shadow-lift"
                    >
                      <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-500 group-open:opacity-100">
                        <div className="absolute -top-24 right-0 h-32 w-32 rounded-full bg-brand-500/20 blur-2xl" />
                      </div>
                      <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                        <div className="flex gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 transition duration-300 group-open:bg-brand-700 group-open:text-brand-50">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex flex-col gap-2">
                            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-700/50">
                              {faq.tag}
                            </span>
                            <h3 className="text-base font-semibold text-brand-700 md:text-lg">
                              {faq.question}
                            </h3>
                            <p className="text-xs text-brand-700/60">{faq.meta}</p>
                          </div>
                        </div>
                        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-brand-700/20 bg-white text-brand-700 transition duration-300 group-hover:-translate-y-0.5 group-open:rotate-45 group-open:border-brand-500 group-open:text-brand-500">
                          +
                        </span>
                      </summary>
                      <div className="mt-4 grid gap-3 text-sm text-brand-700/70 group-open:animate-in group-open:fade-in-0 group-open:slide-in-from-top-2">
                        <p>{faq.answer}</p>
                        <div className="flex items-center gap-3 rounded-2xl border border-brand-700/10 bg-brand-50/80 px-4 py-3 text-xs text-brand-700/70">
                          <CheckCircle2 className="h-4 w-4 text-brand-500" />
                          <span>{faq.tip}</span>
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section id="download" className="relative overflow-hidden bg-white/70">
          <div className="absolute inset-0 bg-grid opacity-30" />
          <div className="absolute -right-20 top-10 h-64 w-64 rounded-full bg-brand-500/30 blur-[120px]" />
          <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-20 lg:px-10">
            <div className="glass-panel relative flex flex-col gap-6 rounded-[36px] px-8 py-10 md:px-12">
              <div className="absolute right-10 top-8 hidden h-16 w-16 animate-pulseSoft rounded-full bg-brand-500/30 blur-xl md:block" />
              <div className="flex flex-col gap-4">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-700/60">
                  Unduh Sekarang
                </p>
                <h2 className="text-3xl font-semibold text-brand-700 md:text-4xl">
                  Instal aplikasi & verifikasi identitas Anda hari ini.
                </h2>
                <p className="text-base text-brand-700/70">
                  Semakin cepat verifikasi, semakin cepat bantuan disalurkan. Ayo bantu Kabupaten
                  Batubara menyalurkan bansos tepat sasaran.
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <AppBadge label="Google Play" />
                <AppBadge label="App Store" />
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-brand-700/70">
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-brand-500" />
                  Gratis & aman
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand-500" />
                  Dukungan 24/7
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-brand-700/10 bg-brand-50">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 text-sm text-brand-700/70 lg:px-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-base font-semibold text-brand-700">Bansos Batubara</p>
              <p className="text-xs text-brand-700/60">
                Layanan verifikasi identitas digital resmi Pemkab Batubara.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <span>Call Center: 1500-177</span>
              <span>Email: bantuan@batubara.go.id</span>
            </div>
          </div>
          <p className="text-xs text-brand-700/60">
            Butuh bantuan? Hubungi kanal resmi di atas. Unduh aplikasi hanya dari toko resmi untuk
            menjaga keamanan data Anda.
          </p>
        </div>
      </footer>
    </div>
  );
};
