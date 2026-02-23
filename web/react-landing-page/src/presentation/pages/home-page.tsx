import { useEffect, useMemo, useState } from "react";
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
    <div className="flex min-h-[calc(100vh-160px)] flex-col">
      <div className="relative flex-1 overflow-hidden bg-transparent">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-sky-50" />
        <div className="absolute -left-20 top-8 h-56 w-56 rounded-full bg-sky-200/60 blur-3xl" />
        <div className="absolute right-10 top-6 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute bottom-8 left-16 hidden h-24 w-24 rounded-full border border-slate-200/60 md:block" />
        <div className="absolute right-16 bottom-12 hidden h-28 w-28 rounded-full border border-slate-200/60 md:block" />
        <div className="absolute left-10 top-16 hidden h-32 w-px bg-slate-300/70 md:block" />
        <div className="absolute left-14 top-20 hidden h-32 w-px bg-slate-300/40 md:block" />

        <div className="relative grid h-full gap-10 p-10 lg:grid-cols-[1.25fr_auto_1fr]">
          <div className="space-y-6">
            <div className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
              Secure Gate Admin
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-semibold text-foreground md:text-4xl">
                {greeting.salutation}
              </div>
              <div className="text-6xl font-black tracking-tight text-foreground md:text-7xl">
                {greeting.period},
              </div>
              <div className="text-2xl font-semibold text-foreground md:text-3xl">
                {actorName}!
              </div>
            </div>
            <div className="max-w-md text-sm text-muted-foreground">
              Semoga harimu produktif. Fokus pada ketelitian untuk setiap
              verifikasi, dan pastikan setiap keputusan terekam rapi.
            </div>
            <div className="flex items-center gap-4 pt-2">
              <div className="h-10 w-10 rounded-full border border-slate-200/80 bg-white/70 shadow-sm" />
              <div className="h-10 w-16 rounded-full border border-slate-200/80 bg-white/70 shadow-sm" />
              <div className="h-10 w-10 rounded-full border border-slate-200/80 bg-white/70 shadow-sm" />
            </div>
          </div>

          <div className="hidden w-px bg-border/70 lg:block" />

          <div className="space-y-5">
            <div className="flex items-baseline gap-4">
              <div className="text-4xl font-semibold text-foreground md:text-5xl">
                {formatTime(now)}
              </div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                WIB
              </div>
            </div>
            <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {formatDate(now)}
            </div>
            <div className="space-y-3 rounded-2xl border border-border/60 bg-white/80 p-5 shadow-sm">
              {scheduleState.mode === "active" ? (
                <div className="space-y-3">
                  <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      {scheduleState.currentStatus}
                    </div>
                  </div>
                  <div className="rounded-xl border border-dashed border-slate-200/80 bg-slate-50/60 px-4 py-3 text-sm text-slate-700">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Berikutnya
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span>{scheduleState.upcoming.label}</span>
                      <span className="font-semibold">
                        {scheduleState.upcoming.time}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200/80 bg-slate-50/60 px-4 py-3 text-sm text-muted-foreground saturate-50">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Sedang lembur
                  </div>
                </div>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </div>
            <div>
              {!isLocked ? (
                <Button onClick={() => setLockOpen(true)}>Lock Page</Button>
              ) : (
                <Button variant="outline" onClick={() => setUnlockOpen(true)}>
                  Unlock Page
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <Sheet open={lockOpen} onOpenChange={setLockOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Lock Page</SheetTitle>
            <SheetDescription>
              Masukkan password untuk mengunci.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Password
              </label>
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
            <SheetDescription>
              Masukkan password untuk membuka.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Password
              </label>
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
