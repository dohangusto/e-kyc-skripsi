import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, SyntheticEvent } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, FileText, Upload } from "lucide-react";
import { PageHeader } from "@/presentation/components/page-header";
import { Button } from "@/presentation/components/ui/button";
import { Card } from "@/presentation/components/ui/card";
import { Input } from "@/presentation/components/ui/input";
import { maskNik } from "@/shared/lib/mask-nik";
import { clusteringStore } from "@/shared/lib/clustering-store";
import type { ClusterResult } from "@/shared/types/clustering";
import { toast } from "sonner";

type BansosType = "PKH" | "PBI" | "BPNT" | "Non-Bansos";
type AidBansosType = Exclude<BansosType, "Non-Bansos">;

type BansosResult = ClusterResult & {
  birthYear: number;
  priority: number;
  bansosType: BansosType;
};

const clusteringResults: BansosResult[] = [
  {
    name: "Fajar Maulana",
    nik: "3276011209900007",
    cluster: "PKH",
    score: 0.93,
    dependents: 6,
    birthYear: 1990,
    priority: 1,
    bansosType: "PKH",
  },
  {
    name: "Andi Pratama",
    nik: "3276011209900003",
    cluster: "PKH",
    score: 0.9,
    dependents: 5,
    birthYear: 1988,
    priority: 2,
    bansosType: "PKH",
  },
  {
    name: "Siti Aminah",
    nik: "3276011209900001",
    cluster: "PKH",
    score: 0.86,
    dependents: 4,
    birthYear: 1992,
    priority: 3,
    bansosType: "PKH",
  },
  {
    name: "Rahmat Hidayat",
    nik: "3276011209900002",
    cluster: "BPNT",
    score: 0.73,
    dependents: 3,
    birthYear: 1986,
    priority: 4,
    bansosType: "BPNT",
  },
  {
    name: "Sari Melati",
    nik: "3276011209900008",
    cluster: "BPNT",
    score: 0.69,
    dependents: 3,
    birthYear: 1989,
    priority: 5,
    bansosType: "BPNT",
  },
  {
    name: "Lestari Dewi",
    nik: "3276011209900004",
    cluster: "BPNT",
    score: 0.65,
    dependents: 2,
    birthYear: 1984,
    priority: 6,
    bansosType: "PBI",
  },
  {
    name: "Dedi Kurniawan",
    nik: "3276011209900009",
    cluster: "PBI",
    score: 0.62,
    dependents: 4,
    birthYear: 1995,
    priority: 7,
    bansosType: "Non-Bansos",
  },
  {
    name: "Budi Santoso",
    nik: "3276011209900005",
    cluster: "PBI",
    score: 0.58,
    dependents: 3,
    birthYear: 1993,
    priority: 8,
    bansosType: "Non-Bansos",
  },
];

const BANSOS_OPTIONS: BansosType[] = ["PKH", "PBI", "BPNT", "Non-Bansos"];
const AID_BANSOS_OPTIONS: AidBansosType[] = ["PKH", "PBI", "BPNT"];
const createEmptyQuota = (): Record<AidBansosType, number> => ({
  PKH: 0,
  PBI: 0,
  BPNT: 0,
});

export const ClusteringPage = () => {
  const navigate = useNavigate();
  const uploadId = useId();
  const [status, setStatus] = useState<"idle" | "running" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [sessionName, setSessionName] = useState("");
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeBansos, setActiveBansos] = useState<"Semua" | BansosType>(
    "Semua",
  );
  const [quotaByBansos, setQuotaByBansos] =
    useState<Record<AidBansosType, number>>(createEmptyQuota);
  const [sortKey, setSortKey] = useState<
    "priority" | "score" | "bansosType"
  >("priority");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [revealStage, setRevealStage] = useState({
    logs: false,
    session: false,
    results: false,
  });
  const pageSize = 6;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const logTimerRef = useRef<number | null>(null);

  const logLines = useMemo(
    () => [
      "init: validating dataset headers...",
      "scan: detecting missing values...",
      "normalize: scaling numeric features...",
      "encode: mapping categorical fields...",
      "model: running k-means++ seed...",
      "model: refining centroids (iter 1/5)...",
      "model: refining centroids (iter 2/5)...",
      "model: refining centroids (iter 3/5)...",
      "model: refining centroids (iter 4/5)...",
      "model: refining centroids (iter 5/5)...",
      "assign: scoring households...",
      "export: assembling cluster results...",
      "done: clustering completed.",
    ],
    [],
  );

  const results = useMemo(() => {
    return status === "done" ? clusteringResults : [];
  }, [status]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (logTimerRef.current) window.clearInterval(logTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (status === "idle") {
      setRevealStage({ logs: false, session: false, results: false });
      return;
    }
    if (status === "running") {
      setRevealStage({ logs: false, session: false, results: false });
      const logRevealTimer = window.setTimeout(() => {
        setRevealStage((prev) => ({ ...prev, logs: true }));
      }, 500);
      return () => window.clearTimeout(logRevealTimer);
    }
  }, [status]);

  useEffect(() => {
    if (status !== "done") return;
    const sessionRevealTimer = window.setTimeout(() => {
      setRevealStage((prev) => ({ ...prev, session: true }));
    }, 500);
    const resultsRevealTimer = window.setTimeout(() => {
      setRevealStage((prev) => ({ ...prev, results: true }));
    }, 900);
    return () => {
      window.clearTimeout(sessionRevealTimer);
      window.clearTimeout(resultsRevealTimer);
    };
  }, [status]);

  useEffect(() => {
    if (status === "running") {
      setIsLogOpen(true);
    }
    if (status === "done") {
      setIsLogOpen(false);
    }
  }, [status]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, activeBansos, sortKey, sortDir, quotaByBansos]);

  const formatFileSize = (size: number) => {
    if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    if (size >= 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${size} B`;
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
  };

  const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    if (status === "running") return;
    setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    if (status === "running") return;
    setIsDragActive(false);
    const file = event.dataTransfer.files?.[0] ?? null;
    if (file) setSelectedFile(file);
  };

  const handleRun = () => {
    if (!selectedFile) {
      toast.error("Pilih file dataset terlebih dahulu.");
      return;
    }
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (logTimerRef.current) window.clearInterval(logTimerRef.current);
    setStatus("running");
    setProgress(0);
    setLogs([]);
    setSessionName("");
    setSavedSessionId(null);
    setQuotaByBansos(createEmptyQuota());
    timerRef.current = window.setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(prev + Math.random() * 18 + 6, 100);
        if (next >= 100) {
          window.clearInterval(timerRef.current ?? undefined);
          timerRef.current = null;
          setStatus("done");
        }
        return next;
      });
    }, 320);
    logTimerRef.current = window.setInterval(() => {
      setLogs((prev) => {
        if (prev.length >= logLines.length) {
          window.clearInterval(logTimerRef.current ?? undefined);
          logTimerRef.current = null;
          return prev;
        }
        return [...prev, logLines[prev.length]];
      });
    }, 420);
  };

  const handleSaveSession = () => {
    if (!sessionName.trim()) {
      toast.error("Nama session wajib diisi.");
      return;
    }
    if (!selectedResults.length) {
      toast.error("Atur kuota hingga ada penerima yang terpilih.");
      return;
    }
    const session = clusteringStore.addSession(sessionName.trim(), selectedResults);
    clusteringStore.updateReviewSelection(session.id, {
      quota: quotaByBansos,
      selectedNiks: selectedResults.map((item) => item.nik),
    });
    setSavedSessionId(session.id);
    toast.success(`${selectedResults.length} penerima disimpan ke session.`);
  };

  const handleToggleLogs = (event: SyntheticEvent<HTMLDetailsElement>) => {
    setIsLogOpen(event.currentTarget.open);
  };

  const handleSort = (key: "priority" | "score" | "bansosType") => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    if (key === "priority") {
      setSortDir("asc");
      return;
    }
    setSortDir(key === "bansosType" ? "asc" : "desc");
  };

  const canRun = Boolean(selectedFile) && status !== "running";
  const showProgress = status === "running";
  const showCompletion = status === "done";
  const showLogs = status !== "idle" && revealStage.logs;
  const showSessionForm = status === "done" && revealStage.session;
  const showResults = status === "done" && revealStage.results;

  const bansosCounts = useMemo(() => {
    const base = BANSOS_OPTIONS.reduce(
      (acc, item) => {
        acc[item] = 0;
        return acc;
      },
      {} as Record<BansosType, number>,
    );
    return results.reduce((acc, item) => {
      acc[item.bansosType] += 1;
      return acc;
    }, base);
  }, [results]);

  const bansosList = BANSOS_OPTIONS;

  const totalProcessed = results.length;
  const priorityCount = totalProcessed - bansosCounts["Non-Bansos"];
  const nonBansosCount = bansosCounts["Non-Bansos"];
  const scoreRange = useMemo(() => {
    if (!results.length) return null;
    const scores = results.map((item) => item.score);
    return {
      min: Math.min(...scores),
      max: Math.max(...scores),
    };
  }, [results]);

  const topBansosEntry = useMemo(() => {
    const entries = Object.entries(bansosCounts);
    if (!entries.length) return null;
    return entries.sort((a, b) => b[1] - a[1])[0];
  }, [bansosCounts]);

  const insightSummary = useMemo(() => {
    if (!results.length || !scoreRange || !topBansosEntry) return "";
    return `Mayoritas kandidat direkomendasikan ${topBansosEntry[0]} dengan rentang skor ${scoreRange.min.toFixed(
      2,
    )}-${scoreRange.max.toFixed(2)}.`;
  }, [results, scoreRange, topBansosEntry]);

  const selectedResults = AID_BANSOS_OPTIONS.flatMap((bansos) =>
    [...results]
      .filter((item) => item.bansosType === bansos)
      .sort((a, b) => a.priority - b.priority)
      .slice(0, Math.max(0, quotaByBansos[bansos] ?? 0)),
  ).sort((a, b) => a.priority - b.priority);

  const selectedCountByBansos = selectedResults.reduce((acc, item) => {
    if (item.bansosType === "Non-Bansos") return acc;
    acc[item.bansosType] += 1;
    return acc;
  }, createEmptyQuota());

  const selectedScoreRange = selectedResults.length
    ? {
        min: Math.min(...selectedResults.map((item) => item.score)),
        max: Math.max(...selectedResults.map((item) => item.score)),
      }
    : null;

  const totalSelectedRecipients = selectedResults.length;
  const remainingPriorityRecipients = Math.max(
    priorityCount - totalSelectedRecipients,
    0,
  );
  const activeQuotaTotal = AID_BANSOS_OPTIONS.reduce(
    (total, bansos) => total + quotaByBansos[bansos],
    0,
  );
  const quotaInsight =
    totalSelectedRecipients > 0
      ? `${totalSelectedRecipients} penerima masuk kuota aktif dari ${priorityCount} kandidat prioritas.`
      : "Belum ada penerima yang masuk kuota. Atur kuota per bansos untuk membentuk daftar final.";

  const filteredResults = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    return selectedResults.filter((item) => {
      if (activeBansos !== "Semua" && item.bansosType !== activeBansos)
        return false;
      if (!term) return true;
      return (
        item.name.toLowerCase().includes(term) ||
        item.nik.toLowerCase().includes(term)
      );
    });
  }, [selectedResults, searchQuery, activeBansos]);

  const sortedResults = useMemo(() => {
    const sorted = [...filteredResults];
    sorted.sort((a, b) => {
      if (sortKey === "bansosType") {
        const result = a.bansosType.localeCompare(b.bansosType);
        return sortDir === "asc" ? result : -result;
      }
      const valueA = sortKey === "score" ? a.score : a.priority;
      const valueB = sortKey === "score" ? b.score : b.priority;
      const result = valueA - valueB;
      return sortDir === "asc" ? result : -result;
    });
    return sorted;
  }, [filteredResults, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedResults.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedResults = sortedResults.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const topPriority = selectedResults.length
    ? Math.min(...selectedResults.map((item) => item.priority))
    : null;
  const scoreSpan = selectedScoreRange
    ? Math.max(selectedScoreRange.max - selectedScoreRange.min, 0.01)
    : 1;
  const currentYear = new Date().getFullYear();
  const getPriorityClass = (priority: number) => {
    if (priority <= 2) return "border-primary/30 bg-primary/10 text-primary";
    if (priority <= 4)
      return "border-foreground/20 bg-foreground/5 text-foreground";
    return "border-muted-foreground/20 bg-muted/40 text-muted-foreground";
  };
  const bansosBadgeClass: Record<BansosType, string> = {
    PKH: "border-primary/30 bg-primary/10 text-primary",
    PBI: "border-secondary/40 bg-secondary/40 text-secondary-foreground",
    BPNT: "border-accent/40 bg-accent/30 text-accent-foreground",
    "Non-Bansos": "border-muted-foreground/20 bg-muted/40 text-muted-foreground",
  };

  const handleQuotaChange = (bansos: AidBansosType, value: string) => {
    const parsed = Number(value);
    const nextValue = Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
    const maxValue = bansosCounts[bansos];
    setSavedSessionId(null);
    setQuotaByBansos((prev) => ({
      ...prev,
      [bansos]: Math.min(nextValue, maxValue),
    }));
  };

  const handleResetQuota = () => {
    setSavedSessionId(null);
    setQuotaByBansos(createEmptyQuota());
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Clustering"
        description="Portal eksekusi clustering data calon penerima."
      />

      <Card className="space-y-8 p-6 sm:p-8 md:p-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_0.9fr]">
          <div className="space-y-6 min-w-0">
            <div className="space-y-3">
              <div>
                <div className="text-xl font-semibold text-foreground sm:text-2xl">
                  Input Dataset
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Unggah file data calon penerima untuk diproses ke dalam rekomendasi bansos. Mulai dari unggah dataset, jalankan clustering, lalu
                  simpan sesi untuk ditinjau.
                </div>
              </div>
              <div className="flex flex-col gap-2 text-[11px] text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-2 sm:text-xs">
                <span className="w-fit max-w-full rounded-full border border-border/60 bg-background px-3 py-1 leading-relaxed">
                  1. Unggah dataset
                </span>
                <span className="w-fit max-w-full rounded-full border border-border/60 bg-background px-3 py-1 leading-relaxed">
                  2. Jalankan clustering
                </span>
                <span className="w-fit max-w-full rounded-full border border-border/60 bg-background px-3 py-1 leading-relaxed">
                  3. Simpan hasil
                </span>
              </div>
            </div>

            <div className="space-y-4 min-w-0">
              <div
                className={`w-full rounded-2xl border border-dashed p-4 transition-colors sm:p-6 ${
                  isDragActive
                    ? "border-primary bg-primary/10"
                    : "border-border/60 bg-muted/20"
                }`}
              >
                <Input
                  id={uploadId}
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={status === "running"}
                />
                <label
                  htmlFor={uploadId}
                  onDragEnter={handleDragOver}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl px-3 py-8 text-center transition sm:px-4 sm:py-10 ${
                    status === "running" ? "cursor-not-allowed opacity-70" : ""
                  }`}
                >
                  <div className="rounded-full bg-primary/10 p-3 text-primary">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    Tarik & lepas file dataset di sini
                  </div>
                  <div className="text-xs text-muted-foreground">
                    atau klik untuk memilih file berformat .csv atau .xlsx
                  </div>
                </label>
              </div>
              <div className="rounded-xl border border-border/60 bg-background px-4 py-3 text-xs">
                {selectedFile ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="rounded-full bg-muted p-2 text-muted-foreground">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-foreground">
                          {selectedFile.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatFileSize(selectedFile.size)} - Siap diproses
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      disabled={status === "running"}
                    >
                      Ganti File
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Belum ada file dipilih.</span>
                    <span className="text-[11px] uppercase">
                      Menunggu unggahan
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6 min-w-0">
            <div className="w-full rounded-2xl border border-border/60 bg-muted/40 p-4 text-xs text-muted-foreground sm:p-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground sm:tracking-[0.2em]">
                Setelah dijalankan
              </div>
              <div className="mt-3 space-y-2 leading-relaxed">
                <div className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                  Sistem memvalidasi header, missing values, dan struktur data.
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                  Proses normalisasi dan scoring untuk menentukan cluster prioritas.
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                  Hasil siap disimpan sebagai session untuk ditinjau tim.
                </div>
              </div>
            </div>

            <div className="w-full rounded-2xl border border-primary/20 bg-primary/10 p-4 sm:p-5">
              <div className="text-sm font-semibold text-foreground">
                Jalankan Clustering
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Mulai proses clustering secara bertahap. Progres, log, dan hasil
                akan muncul berurutan agar mudah dipantau.
              </div>
              <Button
                size="lg"
                onClick={handleRun}
                disabled={!canRun}
                className="mt-4 w-full"
              >
                {status === "running" ? "Processing..." : "Run Clustering"}
              </Button>
              <div className="mt-3 text-xs text-muted-foreground">
                {selectedFile
                  ? "Dataset siap diproses. Setelah run, sistem menyiapkan ringkasan hasil."
                  : "Pilih file untuk mengaktifkan tombol Run Clustering."}
              </div>
            </div>
          </div>
        </div>

      </Card>

      {status !== "idle" ? (
        <div className="space-y-6">
          {showCompletion ? (
            <Card className="space-y-4 p-5 sm:p-6 animate-in fade-in slide-in-from-top-2 duration-500">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">
                    Ringkasan hasil rekomendasi
                  </div>
                  <div className="mt-2 text-base font-semibold text-foreground sm:text-lg">
                    Hasil analisis siap ditinjau
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {selectedFile
                      ? `Dataset ${selectedFile.name} telah diproses sepenuhnya.`
                      : "Dataset selesai diproses sepenuhnya."}
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <CheckCircle2 className="h-4 w-4" />
                  Clustering berhasil dijalankan
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-border/60 bg-background p-3">
                  <div className="text-[11px] font-semibold uppercase text-muted-foreground">
                    Data diproses
                  </div>
                  <div className="mt-2 text-xl font-semibold text-foreground">
                    {totalProcessed}
                  </div>
                </div>
                <div className="rounded-lg border border-border/60 bg-background p-3">
                  <div className="text-[11px] font-semibold uppercase text-muted-foreground">
                    Prioritas bansos
                  </div>
                  <div className="mt-2 text-xl font-semibold text-foreground">
                    {priorityCount}
                  </div>
                </div>
                <div className="rounded-lg border border-border/60 bg-background p-3">
                  <div className="text-[11px] font-semibold uppercase text-muted-foreground">
                    Non-Bansos
                  </div>
                  <div className="mt-2 text-xl font-semibold text-foreground">
                    {nonBansosCount}
                  </div>
                </div>
                <div className="rounded-lg border border-border/60 bg-background p-3">
                  <div className="text-[11px] font-semibold uppercase text-muted-foreground">
                    Rentang skor
                  </div>
                  <div className="mt-2 text-xl font-semibold text-foreground">
                    {scoreRange
                      ? `${scoreRange.min.toFixed(2)} - ${scoreRange.max.toFixed(
                          2,
                        )}`
                      : "-"}
                  </div>
                </div>
              </div>
            </Card>
          ) : null}

          {showProgress ? (
            <Card className="space-y-3 p-4 sm:p-5 animate-in fade-in slide-in-from-top-2 duration-500">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-3 w-3 animate-spin rounded-full border border-primary border-t-transparent" />
                  Memproses clustering data...
                </div>
                <span className="text-xs text-muted-foreground">
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted/60">
                <div
                  className="h-2 rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                Sistem sedang menormalkan data dan menghitung skor prioritas.
              </div>
            </Card>
          ) : null}

          {showCompletion ? (
            <Card className="space-y-3 p-4 sm:p-5 animate-in fade-in slide-in-from-top-2 duration-500">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2 text-primary">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      Status selesai
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Proses clustering berhasil dan hasil siap dianalisis.
                    </div>
                  </div>
                </div>
                <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  Clustering berhasil dijalankan
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {insightSummary ||
                  "Hasil sudah lengkap. Silakan lanjutkan ke tahap analisis."}
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted/60">
                <div className="h-1.5 w-full rounded-full bg-primary/40" />
              </div>
            </Card>
          ) : null}

          {showLogs ? (
            <Card className="p-4 sm:p-5 animate-in fade-in slide-in-from-top-2 duration-500">
              <details
                open={isLogOpen}
                onToggle={handleToggleLogs}
                className="group"
              >
                <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-foreground">
                  <div className="flex items-center gap-3">
                    <span>Detail proses sistem</span>
                    <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
                      {logs.length} log
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {isLogOpen ? "Tutup" : "Buka"}
                  </span>
                </summary>
                <div className="mt-4 rounded-lg border border-slate-900/10 bg-slate-900/60 px-3 py-3 font-mono text-[11px] leading-5 text-emerald-100/80 sm:px-4">
                  <div className="pb-1 text-[10px] uppercase tracking-[0.25em] text-emerald-200/70">
                    cluster-cli
                  </div>
                  <div className="max-h-[110px] space-y-1 overflow-x-auto overflow-y-auto pr-1 sm:max-h-[140px] lg:max-h-[120px]">
                    {(logs.length ? logs : ["waiting for process..."]).map(
                      (line, index) => (
                        <div key={`${line}-${index}`} className="flex items-center">
                          <span className="pr-2 text-emerald-200/70">$</span>
                          <span className="whitespace-pre">{line}</span>
                          {status === "running" && index === logs.length - 1 ? (
                            <span className="ml-2 inline-block h-3 w-2 animate-pulse rounded-sm bg-emerald-200/70" />
                          ) : null}
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </details>
            </Card>
          ) : null}

          {showSessionForm ? (
            <Card className="space-y-4 p-5 sm:p-6 animate-in fade-in slide-in-from-top-2 duration-500">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    Simpan Hasil Seleksi
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Session akan menyimpan daftar penerima sesuai kuota aktif
                    untuk peninjauan atau audit berikutnya.
                  </div>
                </div>
                {savedSessionId ? (
                  <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    Session tersimpan
                  </div>
                ) : null}
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.6fr_0.9fr]">
                <Input
                  placeholder="Contoh: Batch Kandidat April"
                  value={sessionName}
                  onChange={(event) => setSessionName(event.target.value)}
                />
                <Button
                  size="lg"
                  onClick={handleSaveSession}
                  disabled={Boolean(savedSessionId) || !totalSelectedRecipients}
                  className="w-full md:w-auto"
                >
                  {savedSessionId ? "Saved" : "Save Session"}
                </Button>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
                {totalSelectedRecipients
                  ? `${totalSelectedRecipients} penerima siap disimpan dari kuota yang aktif.`
                  : "Belum ada penerima terpilih. Isi kuota agar session bisa disimpan."}
              </div>
              {savedSessionId ? (
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>Session tersimpan dan siap ditinjau.</span>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => navigate("/candidates")}
                  >
                    Buka Candidates
                  </Button>
                </div>
              ) : null}
            </Card>
          ) : null}

          {showResults ? (
            <div className="space-y-6">
              <Card className="p-5 sm:p-6 animate-in fade-in slide-in-from-top-2 duration-500">
                <div className="text-sm font-semibold text-foreground">
                  Distribusi Rekomendasi Bansos
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Ringkasan jumlah kandidat per bantuan utama untuk melihat
                  komposisi rekomendasi.
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {bansosList.length ? (
                    bansosList.map((bansos) => (
                      <div
                        key={bansos}
                        className="rounded-lg border border-border/60 bg-background p-3"
                      >
                        <div className="flex items-center justify-between text-[11px] font-semibold uppercase text-muted-foreground">
                          <span>{bansos}</span>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] ${bansosBadgeClass[bansos]}`}
                          >
                            {bansosCounts[bansos]}
                          </span>
                        </div>
                        <div className="mt-2 text-xl font-semibold text-foreground">
                          {bansosCounts[bansos]}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Kandidat terpetakan
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Belum ada data distribusi tersedia.
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-5 sm:p-6 animate-in fade-in slide-in-from-top-2 duration-500">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">
                      Seleksi Penerima Berdasarkan Kuota
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Atur jumlah penerima per jenis bansos. Sistem akan memilih
                      kandidat dengan priority terkecil lebih dulu pada tiap kategori.
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetQuota}
                    className="w-full sm:w-auto"
                  >
                    Reset kuota
                  </Button>
                </div>

                <div className="mt-5 grid gap-3 lg:grid-cols-3">
                  {AID_BANSOS_OPTIONS.map((bansos) => (
                    <div
                      key={bansos}
                      className="rounded-xl border border-border/60 bg-background p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${bansosBadgeClass[bansos]}`}
                        >
                          {bansos}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Tersedia {bansosCounts[bansos]}
                        </span>
                      </div>
                      <div className="mt-4">
                        <label
                          htmlFor={`quota-${bansos}`}
                          className="text-[11px] font-semibold uppercase text-muted-foreground"
                        >
                          Kuota penerima
                        </label>
                        <Input
                          id={`quota-${bansos}`}
                          type="number"
                          min={0}
                          max={bansosCounts[bansos]}
                          inputMode="numeric"
                          value={quotaByBansos[bansos]}
                          onChange={(event) =>
                            handleQuotaChange(bansos, event.target.value)
                          }
                          className="mt-2"
                        />
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Masuk kuota</span>
                        <span className="font-semibold text-foreground">
                          {selectedCountByBansos[bansos]} / {bansosCounts[bansos]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-xl border border-primary/20 bg-primary/10 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold uppercase text-primary/80">
                        Daftar final penerima
                      </div>
                      <div className="mt-1 text-sm font-semibold text-foreground">
                        {quotaInsight}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Kuota aktif saat ini: {activeQuotaTotal} slot untuk PKH,
                        PBI, dan BPNT.
                      </div>
                    </div>
                    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-primary/20 bg-background/70 px-3 py-2">
                        <div className="text-[11px] uppercase text-muted-foreground">
                          Terpilih
                        </div>
                        <div className="mt-1 text-lg font-semibold text-foreground">
                          {totalSelectedRecipients}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-background/70 px-3 py-2">
                        <div className="text-[11px] uppercase text-muted-foreground">
                          Belum teralokasi
                        </div>
                        <div className="mt-1 text-lg font-semibold text-foreground">
                          {remainingPriorityRecipients}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-5 sm:p-6 animate-in fade-in slide-in-from-top-2 duration-500">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-lg font-semibold text-foreground">
                      Preview Seleksi Penerima
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Tabel final penerima berdasarkan kuota aktif, priority, dan
                      rekomendasi bantuan utama dari proses scoring.
                    </div>
                    {insightSummary ? (
                      <div className="mt-3 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-xs text-primary">
                        {insightSummary}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex w-full flex-col gap-3 sm:w-auto">
                    <Input
                      placeholder="Cari nama atau NIK"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      className="h-9 w-full sm:w-[220px]"
                    />
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>Filter bansos utama:</span>
                      <Button
                        type="button"
                        size="sm"
                        variant={activeBansos === "Semua" ? "default" : "outline"}
                        onClick={() => setActiveBansos("Semua")}
                      >
                        Semua
                      </Button>
                      {AID_BANSOS_OPTIONS.map((bansos) => (
                        <Button
                          key={bansos}
                          type="button"
                          size="sm"
                          variant={activeBansos === bansos ? "default" : "outline"}
                          onClick={() => setActiveBansos(bansos)}
                        >
                          {bansos}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-5 overflow-hidden rounded-xl border border-border/70">
                  <div className="max-h-[420px] overflow-auto">
                    <div className="sticky top-0 z-10 grid grid-cols-[1.6fr_1fr_0.9fr_1.1fr_0.7fr] gap-4 border-b bg-muted/80 px-4 py-3 text-xs font-semibold uppercase text-muted-foreground backdrop-blur sm:px-5 lg:grid-cols-[1.4fr_1.8fr_1fr_1fr_0.9fr_1.2fr_0.7fr]">
                      <span className="hidden lg:block">NIK</span>
                      <span>Nama</span>
                      <span className="hidden lg:block">Usia</span>
                      <button
                        type="button"
                        onClick={() => handleSort("score")}
                        className="flex items-center gap-2 text-left"
                      >
                        Score
                        {sortKey === "score" ? (
                          <span className="rounded bg-background px-1 text-[10px] text-foreground">
                            {sortDir.toUpperCase()}
                          </span>
                        ) : null}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSort("priority")}
                        className="flex items-center gap-2 text-left"
                      >
                        Priority
                        {sortKey === "priority" ? (
                          <span className="rounded bg-background px-1 text-[10px] text-foreground">
                            {sortDir.toUpperCase()}
                          </span>
                        ) : null}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSort("bansosType")}
                        className="flex items-center gap-2 text-left"
                      >
                        Jenis Bansos
                        {sortKey === "bansosType" ? (
                          <span className="rounded bg-background px-1 text-[10px] text-foreground">
                            {sortDir.toUpperCase()}
                          </span>
                        ) : null}
                      </button>
                      <span className="text-right">Aksi</span>
                    </div>
                    {paginatedResults.length ? (
                      <div className="divide-y">
                        {paginatedResults.map((item) => {
                          const isTopPriority =
                            topPriority !== null && item.priority === topPriority;
                          const scorePercent = selectedScoreRange
                            ? selectedScoreRange.max === selectedScoreRange.min
                              ? 100
                              : Math.min(
                                  Math.max(
                                    ((item.score - selectedScoreRange.min) /
                                      scoreSpan) *
                                      100,
                                    0,
                                  ),
                                  100,
                                )
                            : 0;
                          const age = currentYear - item.birthYear;
                          return (
                            <div
                              key={item.nik}
                              className={`grid grid-cols-[1.6fr_1fr_0.9fr_1.1fr_0.7fr] gap-4 px-4 py-4 text-xs transition sm:px-5 sm:text-sm lg:grid-cols-[1.4fr_1.8fr_1fr_1fr_0.9fr_1.2fr_0.7fr] ${
                                isTopPriority
                                  ? "border-l-4 border-primary bg-primary/5"
                                  : "odd:bg-muted/20 hover:bg-muted/30"
                              }`}
                            >
                              <div className="hidden text-xs font-medium text-muted-foreground lg:block">
                                <span className="font-mono" title={item.nik}>
                                  {maskNik(item.nik)}
                                </span>
                              </div>
                              <div>
                                <div className="font-semibold text-foreground">
                                  {item.name}
                                </div>
                                <div className="text-xs text-muted-foreground lg:hidden">
                                  {maskNik(item.nik)}
                                </div>
                              </div>
                              <div className="hidden lg:block">
                                <div className="text-sm font-semibold text-foreground">
                                  {age} tahun
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Lahir {item.birthYear}
                                </div>
                              </div>
                              <div>
                                <div
                                  className={`text-sm font-semibold ${
                                    item.score < 0
                                      ? "text-red-500"
                                      : "text-foreground"
                                  }`}
                                >
                                  {item.score.toFixed(2)}
                                </div>
                                <div className="mt-2 h-1.5 w-full rounded-full bg-muted/60">
                                  <div
                                    className="h-1.5 rounded-full bg-primary"
                                    style={{ width: `${scorePercent}%` }}
                                  />
                                </div>
                              </div>
                              <div>
                                <span
                                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getPriorityClass(
                                    item.priority,
                                  )}`}
                                >
                                  P{item.priority}
                                </span>
                              </div>
                              <div className="flex items-center">
                                <span
                                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${bansosBadgeClass[item.bansosType]}`}
                                >
                                  {item.bansosType}
                                </span>
                              </div>
                              <div className="flex justify-end">
                                <Button variant="ghost" size="sm">
                                  Lihat
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="px-5 py-12 text-center text-sm text-muted-foreground">
                        Belum ada penerima yang masuk kuota aktif.
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>
                    Menampilkan{" "}
                    {paginatedResults.length
                      ? (currentPage - 1) * pageSize + 1
                      : 0}{" "}
                    -{" "}
                    {(currentPage - 1) * pageSize + paginatedResults.length} dari{" "}
                    {sortedResults.length} data
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Prev
                    </Button>
                    <span>
                      Hal {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          ) : null}
        </div>
      ) : null}

      {status === "idle" ? (
        <Card className="border-dashed bg-muted/20 p-8">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div className="space-y-2">
              <div className="text-sm font-semibold text-foreground">
                Belum ada proses clustering dijalankan
              </div>
              <div className="text-sm text-muted-foreground">
                Mulai workflow dengan mengunggah dataset dan menekan Run
                Clustering. Hasil akan muncul bertahap setelah proses berjalan.
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border/60 bg-background p-3 text-xs">
                <div className="text-[11px] font-semibold uppercase text-muted-foreground">
                  Step 1
                </div>
                <div className="mt-2 text-sm font-semibold text-foreground">
                  Unggah dataset
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Siapkan file CSV/XLSX sesuai template.
                </div>
              </div>
              <div className="rounded-lg border border-border/60 bg-background p-3 text-xs">
                <div className="text-[11px] font-semibold uppercase text-muted-foreground">
                  Step 2
                </div>
                <div className="mt-2 text-sm font-semibold text-foreground">
                  Jalankan clustering
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Pantau progres dan log proses secara real-time.
                </div>
              </div>
              <div className="rounded-lg border border-border/60 bg-background p-3 text-xs">
                <div className="text-[11px] font-semibold uppercase text-muted-foreground">
                  Step 3
                </div>
                <div className="mt-2 text-sm font-semibold text-foreground">
                  Simpan hasil
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Buat session agar hasil mudah ditinjau.
                </div>
              </div>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
};
