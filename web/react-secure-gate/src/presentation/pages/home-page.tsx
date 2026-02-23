import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlarmClock,
  CheckCircle2,
  Lock,
  ShieldCheck,
  Unlock,
} from "lucide-react";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { useRole } from "@/presentation/components/role-context";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/presentation/components/ui/sheet";
import { toast } from "sonner";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 11) return { salutation: "Selamat", period: "Pagi" };
  if (hour < 15) return { salutation: "Selamat", period: "Siang" };
  if (hour < 19) return { salutation: "Selamat", period: "Sore" };
  return { salutation: "Selamat", period: "Malam" };
};

const formatTime = (date: Date) =>
  date
    .toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    .replace(":", ".");

const formatDate = (date: Date) =>
  date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

type ScheduleItem = {
  label: string;
  time: string;
  minutes: number;
};

const toMinutes = (time: string) => {
  const [hour, minute] = time.split(".").map((value) => Number(value));
  return hour * 60 + minute;
};

const getSchedule = (): ScheduleItem[] => [
  { label: "Istirahat", time: "12.00", minutes: toMinutes("12.00") },
  { label: "Masuk kembali", time: "13.30", minutes: toMinutes("13.30") },
  { label: "Pulang", time: "17.00", minutes: toMinutes("17.00") },
];

const statusHighlights = [
  { title: "Koneksi", value: "Stabil", detail: "TLS aktif" },
  { title: "Antrian", value: "Normal", detail: "Tanpa backlog" },
  { title: "Kualitas", value: "Terjaga", detail: "Audit harian" },
];

const priorityItems = [
  "Review kasus baru dengan kelengkapan dokumen",
  "Validasi NIK & KK terhadap database pusat",
  "Pastikan foto KTP jelas dan bebas pantulan",
];

const quickActions = [
  "Buka daftar kasus prioritas",
  "Pantau antrian verifikasi",
  "Lihat laporan harian",
];

export const HomePage = () => {
  const { actorName, isLocked, lockPage, unlockPage } = useRole();
  const [lockOpen, setLockOpen] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [unlockPassword, setUnlockPassword] = useState("");
  const [now, setNow] = useState(new Date());

  const greeting = useMemo(() => getGreeting(), [now]);
  const scheduleItems = useMemo(() => getSchedule(), []);
  const scheduleState = useMemo(() => {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const [breakItem, backItem, endItem] = scheduleItems;
    if (nowMinutes >= endItem.minutes) {
      return {
        mode: "overtime" as const,
        currentStatus: "Sedang lembur",
      };
    }
    if (nowMinutes < breakItem.minutes) {
      return {
        mode: "active" as const,
        currentStatus: "Sedang bekerja",
        upcoming: breakItem,
      };
    }
    if (nowMinutes < backItem.minutes) {
      return {
        mode: "active" as const,
        currentStatus: "Sedang istirahat",
        upcoming: backItem,
      };
    }
    return {
      mode: "active" as const,
      currentStatus: "Sedang bekerja",
      upcoming: endItem,
    };
  }, [now, scheduleItems]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const handleLock = () => {
    const ok = lockPage(password);
    if (!ok) {
      toast.error("Lock failed. Invalid password.");
      return;
    }
    toast.success("Page locked");
    setPassword("");
    setLockOpen(false);
  };

  const handleUnlock = () => {
    const ok = unlockPage(unlockPassword);
    if (!ok) {
      toast.error("Unlock failed. Invalid password.");
      return;
    }
    toast.success("Page unlocked");
    setUnlockPassword("");
    setUnlockOpen(false);
  };

  return (
    <div className="relative flex min-h-[calc(100vh-160px)] flex-col gap-8 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-card to-muted" />
      <div className="absolute -top-32 right-0 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
      <div className="absolute bottom-0 left-10 h-64 w-64 rounded-full bg-secondary/40 blur-3xl" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(37,52,63,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(37,52,63,0.08)_1px,transparent_1px)] bg-[size:28px_28px] opacity-60" />

      <section className="relative z-10 grid gap-6 px-8 pt-8 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="flex flex-col gap-6 rounded-3xl border border-border/60 bg-card/80 p-8 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
              Secure Gate Operations
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              Live
            </span>
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {formatDate(now)}
            </p>
            <h1 className="text-3xl font-semibold text-foreground md:text-4xl">
              {greeting.salutation} {greeting.period}, {" "}
              <span className="text-primary">{actorName}</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Fokus pada akurasi verifikasi. Setiap keputusan Anda menjaga bantuan sosial tetap tepat sasaran.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {statusHighlights.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-border/60 bg-background/70 p-4"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {item.title}
                </p>
                <p className="mt-2 text-lg font-semibold text-foreground">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            {!isLocked ? (
              <Button onClick={() => setLockOpen(true)}>
                <Lock className="mr-2 h-4 w-4" />
                Kunci Halaman
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setUnlockOpen(true)}>
                <Unlock className="mr-2 h-4 w-4" />
                Buka Halaman
              </Button>
            )}
            <Button variant="outline">
              <ShieldCheck className="mr-2 h-4 w-4" />
              Protokol Verifikasi
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-6 rounded-3xl border border-border/60 bg-card/80 p-8 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Waktu & Shift
              </p>
              <p className="mt-2 text-4xl font-semibold text-foreground md:text-5xl">
                {formatTime(now)}
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">WIB</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <AlarmClock className="h-6 w-6" />
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/70 p-5">
            {scheduleState.mode === "active" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">
                    {scheduleState.currentStatus}
                  </span>
                  <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                    Aktif
                  </span>
                </div>
                <div className="rounded-xl border border-dashed border-border/70 bg-card/60 px-4 py-3 text-sm">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Berikutnya
                  </div>
                  <div className="flex items-center justify-between pt-1 text-foreground">
                    <span>{scheduleState.upcoming.label}</span>
                    <span className="font-semibold">{scheduleState.upcoming.time}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/70 bg-card/60 px-4 py-3 text-sm text-muted-foreground">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em]">
                  Sedang lembur
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
            <Activity className="h-4 w-4 text-primary" />
            Monitoring sistem berjalan otomatis setiap 5 menit.
          </div>
        </div>
      </section>

      <section className="relative z-10 grid gap-6 px-8 pb-10 lg:grid-cols-3">
        <div className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Prioritas Hari Ini
              </p>
              <h3 className="mt-2 text-lg font-semibold text-foreground">Fokus Verifikasi</h3>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {priorityItems.map((item) => (
              <div key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Checklist Kualitas
              </p>
              <h3 className="mt-2 text-lg font-semibold text-foreground">Standar Validasi</h3>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {[
              "Periksa kecocokan NIK dengan KK",
              "Konfirmasi keterbacaan foto KTP",
              "Pastikan swafoto sesuai data",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Akses Cepat
              </p>
              <h3 className="mt-2 text-lg font-semibold text-foreground">Tindakan Prioritas</h3>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <AlarmClock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            {quickActions.map((item) => (
              <div key={item} className="flex items-center justify-between gap-3">
                <span>{item}</span>
                <Button variant="outline" size="sm">
                  Buka
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Sheet open={lockOpen} onOpenChange={setLockOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Lock Page</SheetTitle>
            <SheetDescription>Masukkan password untuk mengunci.</SheetDescription>
          </SheetHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Password</label>
              <Input
                type="password"
                placeholder="••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <Button onClick={handleLock} className="w-full">
              Lock
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={unlockOpen} onOpenChange={setUnlockOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Unlock Page</SheetTitle>
            <SheetDescription>Masukkan password untuk membuka.</SheetDescription>
          </SheetHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Password</label>
              <Input
                type="password"
                placeholder="••••••"
                value={unlockPassword}
                onChange={(event) => setUnlockPassword(event.target.value)}
              />
            </div>
            <Button onClick={handleUnlock} className="w-full">
              Unlock
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
