import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/presentation/components/page-header";
import { EmptyState } from "@/presentation/components/empty-state";
import { Button } from "@/presentation/components/ui/button";
import { Badge } from "@/presentation/components/ui/badge";
import { Card } from "@/presentation/components/ui/card";
import { Input } from "@/presentation/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/presentation/components/ui/tabs";
import { clusteringStore } from "@/shared/lib/clustering-store";
import type { ClusteringSession } from "@/shared/types/clustering";
import type { CaseStatus } from "@/domain/types";
import { maskNik } from "@/shared/lib/mask-nik";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/presentation/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/presentation/components/ui/select";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerTitle,
} from "@/presentation/components/ui/drawer";
import { toast } from "sonner";
import { caseUsecases } from "@/shared/lib/usecases";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { StatusBadge } from "@/presentation/components/status-badge";
import { TableSkeleton } from "@/presentation/components/table-skeleton";

type ClusterCounts = {
  PKH: number;
  BPNT: number;
  PBI: number;
};

const getCounts = (session?: ClusteringSession | null): ClusterCounts => {
  const base = { PKH: 0, BPNT: 0, PBI: 0 };
  if (!session) return base;
  return session.results.reduce((acc, item) => {
    acc[item.cluster] += 1;
    return acc;
  }, base);
};

const ClusterChart = ({ counts }: { counts: ClusterCounts }) => {
  const maxValue = Math.max(counts.PKH, counts.BPNT, counts.PBI, 1);
  const items = [
    { label: "PKH", value: counts.PKH, color: "bg-emerald-400" },
    { label: "BPNT", value: counts.BPNT, color: "bg-blue-400" },
    { label: "PBI", value: counts.PBI, color: "bg-amber-400" },
  ];
  return (
    <div className="flex w-full items-end justify-center gap-6">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col items-center gap-2">
          <div className="text-xs font-semibold text-foreground">{item.value}</div>
          <div className="flex h-24 items-end">
            <div
              className={`w-8 rounded-full ${item.color}`}
              style={{
                height: `${Math.max((item.value / maxValue) * 100, 8)}%`,
              }}
            />
          </div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
};

const statusLabelMap: Record<ClusteringSession["status"], string> = {
  NEED_REVIEW: "Butuh review",
  ON_UPDATING: "On updating",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

const statusClassMap: Record<ClusteringSession["status"], string> = {
  NEED_REVIEW: "border-amber-200 bg-amber-50 text-amber-700",
  ON_UPDATING: "border-blue-200 bg-blue-50 text-blue-700",
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  REJECTED: "border-red-200 bg-red-50 text-red-700",
};

const statusCardClassMap: Record<ClusteringSession["status"], string> = {
  NEED_REVIEW: "border-amber-200/70 bg-amber-50/40",
  ON_UPDATING: "border-blue-200/70 bg-blue-50/40",
  APPROVED: "border-emerald-200/70 bg-emerald-50/40",
  REJECTED: "border-red-200/70 bg-red-50/40",
};

export const CandidatesPage = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ClusteringSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ClusteringSession | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"candidates" | "registered">("candidates");
  const [registeredSearch, setRegisteredSearch] = useState("");
  const [registeredDebouncedSearch, setRegisteredDebouncedSearch] = useState("");
  const [registeredStatus, setRegisteredStatus] = useState<CaseStatus | "ALL">("ALL");
  const [registeredSort, setRegisteredSort] = useState<"NEWEST" | "OLDEST">("NEWEST");
  const [dialogSearch, setDialogSearch] = useState("");
  const [dialogDebouncedSearch, setDialogDebouncedSearch] = useState("");
  const [dialogCluster, setDialogCluster] = useState<
    "ALL" | ClusteringSession["results"][number]["cluster"]
  >("ALL");
  const [dialogSort, setDialogSort] = useState<
    "SCORE_DESC" | "SCORE_ASC" | "NAME_ASC" | "NAME_DESC"
  >("SCORE_DESC");
  const updateTimersRef = useRef<number[]>([]);

  const refreshSessions = () => {
    const data = clusteringStore.listSessions();
    setSessions(data);
    if (data.length && !selectedSession) {
      setSelectedSession(data[0]);
    }
  };

  useEffect(() => {
    refreshSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      updateTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      updateTimersRef.current = [];
    };
  }, []);

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDialogDebouncedSearch(dialogSearch.trim());
    }, 250);
    return () => window.clearTimeout(handler);
  }, [dialogSearch]);

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setRegisteredDebouncedSearch(registeredSearch.trim());
    }, 300);
    return () => window.clearTimeout(handler);
  }, [registeredSearch]);

  const {
    data: eligibleData,
    isLoading: isEligibleLoading,
    isError: isEligibleError,
    refetch: refetchEligible,
  } = useQuery({
    queryKey: [
      "candidates",
      "eligible-cases",
      registeredDebouncedSearch,
      registeredStatus,
      registeredSort,
    ],
    queryFn: () =>
      caseUsecases.listCases({
        page: 1,
        pageSize: 200,
        eligibility: "ELIGIBLE",
        sort: registeredSort,
        status: registeredStatus,
        query: registeredDebouncedSearch || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const eligibleCases = eligibleData?.items ?? [];

  const counts = useMemo(() => getCounts(selectedSession), [selectedSession]);
  const canApprove = selectedSession?.status === "NEED_REVIEW";
  const canReject = selectedSession?.status === "NEED_REVIEW";

  const registeredStatusOptions: Array<{ label: string; value: CaseStatus | "ALL" }> = [
    { label: "All statuses", value: "ALL" },
    { label: "Eligibility Failed", value: "ELIGIBILITY_FAILED" },
    { label: "eKYC In Progress", value: "EKYC_IN_PROGRESS" },
    { label: "eKYC Submitted", value: "EKYC_SUBMITTED" },
    { label: "Auto Verified", value: "AUTO_VERIFIED" },
    { label: "Fallback Review", value: "FALLBACK_REVIEW" },
    { label: "Approved Manual", value: "APPROVED_MANUAL" },
    { label: "Rejected", value: "REJECTED" },
    { label: "Need Reverify", value: "NEED_REVERIFY" },
  ];

  const registeredSortOptions = [
    { label: "Newest", value: "NEWEST" },
    { label: "Oldest", value: "OLDEST" },
  ] as const;

  const clearRegisteredFilters = () => {
    setRegisteredSearch("");
    setRegisteredDebouncedSearch("");
    setRegisteredStatus("ALL");
    setRegisteredSort("NEWEST");
  };

  const filteredResults = useMemo(() => {
    const results = selectedSession?.results ?? [];
    const query = dialogDebouncedSearch.toLowerCase();
    let filtered = results;
    if (query) {
      filtered = filtered.filter(
        (item) => item.name.toLowerCase().includes(query) || item.nik.toLowerCase().includes(query)
      );
    }
    if (dialogCluster !== "ALL") {
      filtered = filtered.filter((item) => item.cluster === dialogCluster);
    }

    return [...filtered].sort((a, b) => {
      if (dialogSort === "SCORE_ASC") return a.score - b.score;
      if (dialogSort === "SCORE_DESC") return b.score - a.score;
      if (dialogSort === "NAME_DESC") return b.name.localeCompare(a.name, "id-ID");
      return a.name.localeCompare(b.name, "id-ID");
    });
  }, [selectedSession, dialogDebouncedSearch, dialogCluster, dialogSort]);

  const hasDialogFilters =
    dialogDebouncedSearch.length > 0 ||
    dialogSearch.length > 0 ||
    dialogCluster !== "ALL" ||
    dialogSort !== "SCORE_DESC";

  const openDrawer = (session: ClusteringSession) => {
    setSelectedSession(session);
    setDrawerOpen(true);
  };

  const openDialog = (session: ClusteringSession) => {
    setSelectedSession(session);
    setDrawerOpen(false);
    setDialogOpen(true);
    setDialogSearch("");
    setDialogDebouncedSearch("");
    setDialogCluster("ALL");
    setDialogSort("SCORE_DESC");
  };

  const updateSessionStatus = (sessionId: string, status: ClusteringSession["status"]) => {
    const updated = clusteringStore.updateStatus(sessionId, status);
    if (updated) {
      setSelectedSession(updated);
    }
    refreshSessions();
  };

  const handleApprove = () => {
    if (!selectedSession) return;
    if (selectedSession.status !== "NEED_REVIEW") return;
    updateSessionStatus(selectedSession.id, "ON_UPDATING");
    toast.success("Approval queued. Updating data...");
    setDrawerOpen(false);
    const timer = window.setTimeout(() => {
      updateSessionStatus(selectedSession.id, "APPROVED");
      toast.success("Clustering approved.");
    }, 2000);
    updateTimersRef.current.push(timer);
  };

  const handleReject = () => {
    if (!selectedSession) return;
    if (selectedSession.status !== "NEED_REVIEW") return;
    updateSessionStatus(selectedSession.id, "REJECTED");
    toast.error("Clustering rejected.");
    setDrawerOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Candidates"
        description="Daftar calon penerima yang belum melakukan eKYC."
        actions={
          <Button variant="outline" size="sm" onClick={refreshSessions}>
            Refresh
          </Button>
        }
      />

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "candidates" | "registered")}
      >
        <TabsList>
          <TabsTrigger value="candidates">Calon Penerima</TabsTrigger>
          <TabsTrigger value="registered">Penerima Terdaftar</TabsTrigger>
        </TabsList>

        <TabsContent value="candidates" className="space-y-6">
          {sessions.length === 0 ? (
            <EmptyState
              title="Belum ada session clustering"
              description="Jalankan proses clustering untuk menampilkan daftar kandidat."
              action={<Button onClick={() => navigate("/clustering")}>Buka Clustering</Button>}
            />
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {sessions.map((session) => (
                  <Card
                    key={session.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openDrawer(session)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") openDrawer(session);
                    }}
                    className={`cursor-pointer space-y-2 border p-5 transition-colors hover:bg-muted/40 ${statusCardClassMap[session.status]}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Session
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${statusClassMap[session.status]}`}
                      >
                        {session.status === "ON_UPDATING" ? (
                          <span className="flex items-center gap-1">
                            <span className="h-2 w-2 animate-spin rounded-full border border-current border-t-transparent" />
                            {statusLabelMap[session.status]}
                          </span>
                        ) : (
                          statusLabelMap[session.status]
                        )}
                      </Badge>
                    </div>
                    <div className="text-base font-semibold text-foreground">{session.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(session.createdAt).toLocaleString("id-ID")}
                    </div>
                    <div className="flex items-center gap-3 pt-2 text-xs text-muted-foreground">
                      <span>PKH {session.results.filter((r) => r.cluster === "PKH").length}</span>
                      <span>BPNT {session.results.filter((r) => r.cluster === "BPNT").length}</span>
                      <span>PBI {session.results.filter((r) => r.cluster === "PBI").length}</span>
                    </div>
                    {session.status === "ON_UPDATING" ? (
                      <div className="flex items-center gap-2 text-[11px] text-blue-600">
                        <span className="h-2.5 w-2.5 animate-spin rounded-full border border-current border-t-transparent" />
                        Sedang memproses update data...
                      </div>
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-1 w-full text-[11px]"
                      onClick={(event) => {
                        event.stopPropagation();
                        openDialog(session);
                      }}
                    >
                      View
                    </Button>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="registered" className="space-y-6">
          <Card className="space-y-4 p-4">
            <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
              <Input
                placeholder="Cari nama atau NIK..."
                value={registeredSearch}
                onChange={(event) => setRegisteredSearch(event.target.value)}
              />
              <Select
                value={registeredStatus}
                onValueChange={(value) => setRegisteredStatus(value as CaseStatus | "ALL")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {registeredStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={registeredSort}
                onValueChange={(value) => setRegisteredSort(value as "NEWEST" | "OLDEST")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  {registeredSortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>Menampilkan {eligibleCases.length} penerima terdaftar</span>
              <Button variant="ghost" size="sm" onClick={clearRegisteredFilters}>
                Clear filters
              </Button>
            </div>
          </Card>
          {isEligibleLoading ? (
            <TableSkeleton />
          ) : isEligibleError ? (
            <EmptyState
              title="Gagal memuat data penerima"
              description="Coba muat ulang data."
              action={<Button onClick={() => refetchEligible()}>Retry</Button>}
            />
          ) : eligibleCases.length === 0 ? (
            <EmptyState
              title="Belum ada penerima terdaftar"
              description="Tidak ada data eligible dari proses eKYC saat ini."
            />
          ) : (
            <Card className="overflow-hidden">
              <div className="grid grid-cols-[2.2fr_1.4fr_1.2fr_1fr] gap-4 border-b bg-muted/40 px-5 py-3 text-xs font-semibold uppercase text-muted-foreground">
                <span>Nama</span>
                <span>Wilayah</span>
                <span>Status</span>
                <span>Eligibility</span>
              </div>
              <div className="divide-y">
                {eligibleCases.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[2.2fr_1.4fr_1.2fr_1fr] gap-4 px-5 py-4 text-sm"
                  >
                    <div>
                      <div className="font-semibold text-foreground">{item.applicant.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {maskNik(item.applicant.nik)}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.applicant.region.province} / {item.applicant.region.city}
                    </div>
                    <div>
                      <StatusBadge status={item.status} abbreviated />
                    </div>
                    <div className="text-xs font-semibold text-emerald-600">Eligible</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="rounded-t-[32px]">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-6 pb-8 pt-6 text-center">
            <div className="space-y-1">
              <DrawerTitle>Ringkasan Clustering</DrawerTitle>
              <DrawerDescription>Distribusi kandidat berdasarkan cluster.</DrawerDescription>
              {selectedSession ? (
                <div className="pt-3">
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${statusClassMap[selectedSession.status]}`}
                  >
                    {selectedSession.status === "ON_UPDATING" ? (
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 animate-spin rounded-full border border-current border-t-transparent" />
                        {statusLabelMap[selectedSession.status]}
                      </span>
                    ) : (
                      statusLabelMap[selectedSession.status]
                    )}
                  </Badge>
                </div>
              ) : null}
            </div>
            <div className="pt-6 text-5xl font-semibold tracking-tight text-foreground">
              {selectedSession?.results.length ?? 0}
            </div>
            <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Total Kandidat
            </div>
            <div className="mt-6 w-full">
              <ClusterChart counts={counts} />
            </div>
            <div className="mt-8 flex w-full max-w-sm flex-col gap-2">
              <Button onClick={handleApprove} disabled={!canApprove}>
                Approve candidates
              </Button>
              <Button variant="destructive" onClick={handleReject} disabled={!canReject}>
                Reject clustering
              </Button>
              <DrawerClose asChild>
                <Button variant="outline">Back/Cancel</Button>
              </DrawerClose>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[92vw] max-w-5xl p-8">
          <DialogHeader>
            <DialogTitle>Daftar Kandidat</DialogTitle>
            <DialogDescription>
              {selectedSession
                ? `${selectedSession.name} · ${selectedSession.results.length} kandidat`
                : "Daftar kandidat dari sesi clustering."}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 space-y-4">
            <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
              <Input
                placeholder="Cari nama atau NIK..."
                value={dialogSearch}
                onChange={(event) => setDialogSearch(event.target.value)}
              />
              <Select
                value={dialogCluster}
                onValueChange={(value) =>
                  setDialogCluster(value as "ALL" | ClusteringSession["results"][number]["cluster"])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Cluster" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua cluster</SelectItem>
                  <SelectItem value="PKH">PKH</SelectItem>
                  <SelectItem value="BPNT">BPNT</SelectItem>
                  <SelectItem value="PBI">PBI</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={dialogSort}
                onValueChange={(value) =>
                  setDialogSort(value as "SCORE_DESC" | "SCORE_ASC" | "NAME_ASC" | "NAME_DESC")
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SCORE_DESC">Skor tertinggi</SelectItem>
                  <SelectItem value="SCORE_ASC">Skor terendah</SelectItem>
                  <SelectItem value="NAME_ASC">Nama A-Z</SelectItem>
                  <SelectItem value="NAME_DESC">Nama Z-A</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                Menampilkan {filteredResults.length} dari {selectedSession?.results.length ?? 0}{" "}
                kandidat
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDialogSearch("");
                  setDialogDebouncedSearch("");
                  setDialogCluster("ALL");
                  setDialogSort("SCORE_DESC");
                }}
                disabled={!hasDialogFilters}
              >
                Clear filters
              </Button>
            </div>
          </div>
          <div className="mt-4 max-h-[62vh] overflow-y-auto rounded-xl border border-border/60">
            <div className="grid grid-cols-[2.2fr_1fr_1fr_1fr] gap-4 border-b bg-muted/40 px-6 py-3 text-xs font-semibold uppercase text-muted-foreground">
              <span>Nama</span>
              <span>Cluster</span>
              <span>Skor</span>
              <span>Status</span>
            </div>
            <div className="divide-y">
              {filteredResults.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                  Tidak ada kandidat yang sesuai dengan filter.
                </div>
              ) : (
                filteredResults.map((item) => (
                  <div
                    key={`dialog-${selectedSession?.id ?? "session"}-${item.nik}`}
                    className="grid grid-cols-[2.2fr_1fr_1fr_1fr] gap-4 px-6 py-4 text-sm"
                  >
                    <div>
                      <div className="font-semibold text-foreground">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{maskNik(item.nik)}</div>
                    </div>
                    <div className="text-sm font-medium text-muted-foreground">{item.cluster}</div>
                    <div className="text-sm font-semibold text-foreground">
                      {item.score.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">Belum eKYC</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
