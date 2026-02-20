import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/presentation/components/page-header";
import { Button } from "@/presentation/components/ui/button";
import { Card } from "@/presentation/components/ui/card";
import { Input } from "@/presentation/components/ui/input";
import { maskNik } from "@/shared/lib/mask-nik";

type ClusterResult = {
  name: string;
  nik: string;
  cluster: string;
  score: number;
  dependents: number;
};

const clusteringResults: ClusterResult[] = [
  {
    name: "Fajar Maulana",
    nik: "3276011209900007",
    cluster: "PKH",
    score: 0.93,
    dependents: 6,
  },
  {
    name: "Andi Pratama",
    nik: "3276011209900003",
    cluster: "PKH",
    score: 0.9,
    dependents: 5,
  },
  {
    name: "Siti Aminah",
    nik: "3276011209900001",
    cluster: "PKH",
    score: 0.86,
    dependents: 4,
  },
  {
    name: "Rahmat Hidayat",
    nik: "3276011209900002",
    cluster: "BPNT",
    score: 0.73,
    dependents: 3,
  },
  {
    name: "Sari Melati",
    nik: "3276011209900008",
    cluster: "BPNT",
    score: 0.69,
    dependents: 3,
  },
  {
    name: "Lestari Dewi",
    nik: "3276011209900004",
    cluster: "BPNT",
    score: 0.65,
    dependents: 2,
  },
  {
    name: "Dedi Kurniawan",
    nik: "3276011209900009",
    cluster: "PBI",
    score: 0.62,
    dependents: 4,
  },
  {
    name: "Budi Santoso",
    nik: "3276011209900005",
    cluster: "PBI",
    score: 0.58,
    dependents: 3,
  },
];

export const ClusteringPage = () => {
  const [status, setStatus] = useState<"idle" | "running" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
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

  const handleRun = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (logTimerRef.current) window.clearInterval(logTimerRef.current);
    setStatus("running");
    setProgress(0);
    setLogs([]);
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clustering"
        description="Portal eksekusi clustering data calon penerima."
      />

      <Card className="space-y-5 p-6">
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            Input Dataset
          </div>
          <div className="text-sm text-muted-foreground">
            Unggah file data calon penerima untuk diproses ke dalam cluster
            prioritas.
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-[1.4fr_auto]">
          <Input type="file" />
          <Button
            variant="outline"
            onClick={handleRun}
            disabled={status === "running"}
          >
            {status === "running" ? "Processing..." : "Run Clustering"}
          </Button>
        </div>

        {status !== "idle" ? (
          <div className="space-y-3 rounded-xl border border-border/60 bg-muted/30 p-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                {status === "running" ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border border-primary border-t-transparent" />
                    Memproses clustering data...
                  </>
                ) : (
                  "Clustering selesai. Menampilkan hasil."
                )}
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
            <div className="rounded-lg border border-slate-900/10 bg-slate-950 px-4 py-3 font-mono text-[11px] leading-5 text-emerald-200">
              <div className="pb-1 text-[10px] uppercase tracking-[0.25em] text-emerald-300/70">
                cluster-cli
              </div>
              <div className="max-h-[170px] space-y-1 overflow-y-auto pr-1">
                {(logs.length ? logs : ["waiting for process..."]).map(
                  (line, index) => (
                    <div key={`${line}-${index}`} className="flex items-center">
                      <span className="pr-2 text-emerald-400">$</span>
                      <span>{line}</span>
                      {status === "running" && index === logs.length - 1 ? (
                        <span className="ml-2 inline-block h-3 w-2 animate-pulse rounded-sm bg-emerald-400/70" />
                      ) : null}
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        ) : null}
      </Card>

      {results.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-[2.2fr_1fr_1fr_1fr] gap-4 border-b bg-muted/40 px-5 py-3 text-xs font-semibold uppercase text-muted-foreground">
            <span>Nama</span>
            <span>Cluster</span>
            <span>Skor</span>
            <span>Tanggungan</span>
          </div>
          <div className="divide-y">
            {results.map((item) => (
              <div
                key={item.nik}
                className="grid grid-cols-[2.2fr_1fr_1fr_1fr] gap-4 px-5 py-4 text-sm"
              >
                <div>
                  <div className="font-semibold text-foreground">
                    {item.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {maskNik(item.nik)}
                  </div>
                </div>
                <div className="text-sm font-medium text-muted-foreground">
                  {item.cluster}
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {item.score.toFixed(2)}
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {item.dependents}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
};
