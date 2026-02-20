import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type {
  CaseStatus,
  FaceMatch,
  RiskLevel,
  Eligibility,
} from "@/domain/types";
import { PageHeader } from "@/presentation/components/page-header";
import { EmptyState } from "@/presentation/components/empty-state";
import { StatusBadge } from "@/presentation/components/status-badge";
import { RiskBadge } from "@/presentation/components/risk-badge";
import { SignalBadge } from "@/presentation/components/signal-badge";
import { Button } from "@/presentation/components/ui/button";
import { Card } from "@/presentation/components/ui/card";
import { Input } from "@/presentation/components/ui/input";
import { TableSkeleton } from "@/presentation/components/table-skeleton";
import { ErrorPanel } from "@/presentation/components/error-panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/presentation/components/ui/select";
import { Checkbox } from "@/presentation/components/ui/checkbox";
import { caseUsecases } from "@/shared/lib/usecases";
import { maskNik } from "@/shared/lib/mask-nik";
import { useRole } from "@/presentation/components/role-context";
import { Badge } from "@/presentation/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/presentation/components/ui/dialog";
import type {
  CasesQueryState,
  AssignedFilter,
  TriageTagFilter,
} from "@/shared/types/cases-query-state";
import {
  deleteView,
  loadSavedViews,
  saveView,
  updateView,
  type SavedView,
} from "@/shared/lib/savedViews";

const statusOptions: Array<{ label: string; value: CaseStatus | "ALL" }> = [
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

const eligibilityOptions: Array<{ label: string; value: "ALL" | Eligibility }> =
  [
    { label: "All eligibility", value: "ALL" },
    { label: "Eligible", value: "ELIGIBLE" },
    { label: "Ineligible", value: "INELIGIBLE" },
  ];

const faceMatchOptions: Array<{ label: string; value: "ALL" | FaceMatch }> = [
  { label: "All face match", value: "ALL" },
  { label: "Match", value: "MATCH" },
  { label: "Mismatch", value: "MISMATCH" },
  { label: "Pending", value: "PENDING" },
];

const riskOptions: Array<{ label: string; value: "ALL" | RiskLevel }> = [
  { label: "All risk", value: "ALL" },
  { label: "Low", value: "LOW" },
  { label: "Medium", value: "MEDIUM" },
  { label: "High", value: "HIGH" },
];

const triageOptions: Array<{ label: string; value: TriageTagFilter }> = [
  { label: "All tags", value: "ALL" },
  { label: "Follow up", value: "FOLLOW_UP" },
  { label: "Suspicious", value: "SUSPICIOUS" },
  { label: "No tag", value: "NONE" },
];

const assignOptions: Array<{ label: string; value: AssignedFilter }> = [
  { label: "All", value: "ALL" },
  { label: "Assigned to me", value: "ASSIGNED_TO_ME" },
  { label: "Unassigned", value: "UNASSIGNED" },
];

const sortOptions = [
  { label: "Newest", value: "NEWEST" },
  { label: "Oldest", value: "OLDEST" },
] as const;

const pageSizeOptions = [10, 20, 50];

const formatAge = (hours: number) => {
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
};

const buildState = (state: Partial<CasesQueryState>): CasesQueryState => ({
  query: state.query ?? "",
  status: state.status ?? "ALL",
  eligibility: state.eligibility ?? "ALL",
  faceMatch: state.faceMatch ?? "ALL",
  riskLevel: state.riskLevel ?? "ALL",
  sort: state.sort ?? "NEWEST",
  pageSize: state.pageSize ?? 20,
  triageTag: state.triageTag ?? "ALL",
  assigned: state.assigned ?? "ALL",
});

export const CasesPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { role, actorName } = useRole();
  const initial = useMemo(() => {
    const loaded = loadSavedViews(role);
    const defaultView = loaded.find((view) => view.isDefault);
    return {
      loaded,
      defaultState: buildState(defaultView?.state ?? {}),
      defaultViewId: defaultView?.id ?? null,
    };
  }, [role]);

  const [search, setSearch] = useState(initial.defaultState.query);
  const [debouncedSearch, setDebouncedSearch] = useState(
    initial.defaultState.query,
  );
  const [status, setStatus] = useState<CaseStatus | "ALL">(
    initial.defaultState.status,
  );
  const [eligibility, setEligibility] = useState<"ALL" | Eligibility>(
    initial.defaultState.eligibility,
  );
  const [faceMatch, setFaceMatch] = useState<"ALL" | FaceMatch>(
    initial.defaultState.faceMatch,
  );
  const [riskLevel, setRiskLevel] = useState<"ALL" | RiskLevel>(
    initial.defaultState.riskLevel,
  );
  const [triageTag, setTriageTag] = useState<TriageTagFilter>(
    initial.defaultState.triageTag,
  );
  const [assigned, setAssigned] = useState<AssignedFilter>(
    initial.defaultState.assigned,
  );
  const [sort, setSort] = useState<"NEWEST" | "OLDEST">(
    initial.defaultState.sort,
  );
  const [pageSize, setPageSize] = useState(initial.defaultState.pageSize);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [views, setViews] = useState<SavedView[]>(initial.loaded);
  const [activeViewId, setActiveViewId] = useState<string | null>(
    initial.defaultViewId,
  );
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const [makeDefault, setMakeDefault] = useState(false);

  const applyState = useCallback((state: CasesQueryState) => {
    setSearch(state.query);
    setDebouncedSearch(state.query);
    setStatus(state.status);
    setEligibility(state.eligibility);
    setFaceMatch(state.faceMatch);
    setRiskLevel(state.riskLevel);
    setTriageTag(state.triageTag);
    setAssigned(state.assigned);
    setSort(state.sort);
    setPageSize(state.pageSize);
    setPage(1);
  }, []);

  const applyView = useCallback(
    (view: SavedView) => {
      applyState(view.state);
      setActiveViewId(view.id);
    },
    [applyState],
  );

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => window.clearTimeout(handler);
  }, [search]);

  const queryParams = useMemo(
    () => ({
      page,
      pageSize,
      query: debouncedSearch || undefined,
      status,
      eligibility,
      faceMatch,
      riskLevel,
      sort,
    }),
    [
      page,
      pageSize,
      debouncedSearch,
      status,
      eligibility,
      faceMatch,
      riskLevel,
      sort,
    ],
  );

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["cases", "queue", queryParams],
    queryFn: () => caseUsecases.listCases(queryParams),
    placeholderData: keepPreviousData,
  });

  const actor = { role, name: actorName };

  const assignMutation = useMutation({
    mutationFn: (caseId: string) => caseUsecases.assignCase(caseId, actor),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["cases", "queue"] }),
  });

  const unassignMutation = useMutation({
    mutationFn: (caseId: string) => caseUsecases.unassignCase(caseId, actor),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["cases", "queue"] }),
  });

  const bulkMutation = useMutation({
    mutationFn: (
      action:
        | { type: "ASSIGN_TO_ME" }
        | { type: "UNASSIGN" }
        | { type: "TAG"; tag: "FOLLOW_UP" | "SUSPICIOUS" | null },
    ) => caseUsecases.bulkTriage(selectedIds, action, actor),
    onSuccess: () => {
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["cases", "queue"] });
    },
  });

  const totalItems = data?.totalItems ?? 0;
  const items = data?.items ?? [];
  const currentPage = data?.page ?? page;
  const currentPageSize = data?.pageSize ?? pageSize;
  const startIndex =
    totalItems === 0 ? 0 : (currentPage - 1) * currentPageSize + 1;
  const endIndex = totalItems === 0 ? 0 : startIndex + items.length - 1;

  const selectAllOnPage = (checked: boolean) => {
    if (checked) {
      setSelectedIds(items.map((item) => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelected = (caseId: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, caseId] : prev.filter((id) => id !== caseId),
    );
  };

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatus("ALL");
    setEligibility("ALL");
    setFaceMatch("ALL");
    setRiskLevel("ALL");
    setTriageTag("ALL");
    setAssigned("ALL");
    setSort("NEWEST");
    setPageSize(20);
    setPage(1);
    setActiveViewId(null);
  };

  const saveCurrentView = () => {
    const view: SavedView = {
      id: `view-${Date.now()}`,
      name: viewName.trim(),
      createdAt: new Date().toISOString(),
      isDefault: makeDefault,
      state: buildState({
        query: search,
        status,
        eligibility,
        faceMatch,
        riskLevel,
        sort,
        pageSize,
        triageTag,
        assigned,
      }),
    };
    saveView(role, view);
    const updated = loadSavedViews(role);
    setViews(updated);
    setSaveDialogOpen(false);
    setViewName("");
    setMakeDefault(false);
    setActiveViewId(view.id);
  };

  const handleDeleteView = (id: string) => {
    deleteView(role, id);
    const updated = loadSavedViews(role);
    setViews(updated);
    if (activeViewId === id) {
      setActiveViewId(null);
    }
  };

  const handleRenameView = (view: SavedView) => {
    updateView(role, view);
    const updated = loadSavedViews(role);
    setViews(updated);
  };

  const canAct = role === "VERIFIER";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Verification Cases"
        description="Queue for eligibility and eKYC review"
        actions={
          <div className="flex items-center gap-2">
            <Select
              value={activeViewId ?? "ALL"}
              onValueChange={(value) => {
                if (value === "ALL") {
                  clearFilters();
                  return;
                }
                if (value === "SAVE") {
                  setSaveDialogOpen(true);
                  return;
                }
                if (value === "MANAGE") {
                  setManageDialogOpen(true);
                  return;
                }
                const selected = views.find((view) => view.id === value);
                if (selected) applyView(selected);
              }}
            >
              <SelectTrigger className="h-8 w-[180px]">
                <SelectValue placeholder="Views" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All cases</SelectItem>
                {views.map((view) => (
                  <SelectItem key={view.id} value={view.id}>
                    {view.name}
                  </SelectItem>
                ))}
                <SelectItem value="SAVE">Save current view...</SelectItem>
                <SelectItem value="MANAGE">Manage views...</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Refresh
            </Button>
          </div>
        }
      />

      {selectedIds.length > 0 && canAct ? (
        <Card className="flex flex-wrap items-center gap-2 p-3">
          <span className="text-sm text-muted-foreground">
            Selected {selectedIds.length} cases
          </span>
          <Button
            size="sm"
            onClick={() => bulkMutation.mutate({ type: "ASSIGN_TO_ME" })}
          >
            Assign to me
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => bulkMutation.mutate({ type: "UNASSIGN" })}
          >
            Unassign
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              bulkMutation.mutate({ type: "TAG", tag: "FOLLOW_UP" })
            }
          >
            Tag: Follow up
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              bulkMutation.mutate({ type: "TAG", tag: "SUSPICIOUS" })
            }
          >
            Tag: Suspicious
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => bulkMutation.mutate({ type: "TAG", tag: null })}
          >
            Clear tag
          </Button>
        </Card>
      ) : null}

      <Card className="space-y-4 p-4">
        <div className="grid gap-3 lg:grid-cols-[2fr_repeat(7,1fr)]">
          <Input
            placeholder="Search name or NIK..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as CaseStatus | "ALL");
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={eligibility}
            onValueChange={(value) => {
              setEligibility(value as "ALL" | Eligibility);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Eligibility" />
            </SelectTrigger>
            <SelectContent>
              {eligibilityOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={faceMatch}
            onValueChange={(value) => {
              setFaceMatch(value as "ALL" | FaceMatch);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Face Match" />
            </SelectTrigger>
            <SelectContent>
              {faceMatchOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={riskLevel}
            onValueChange={(value) => {
              setRiskLevel(value as "ALL" | RiskLevel);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Risk" />
            </SelectTrigger>
            <SelectContent>
              {riskOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={triageTag}
            onValueChange={(value) => {
              setTriageTag(value as TriageTagFilter);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              {triageOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={assigned}
            onValueChange={(value) => {
              setAssigned(value as AssignedFilter);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Assigned" />
            </SelectTrigger>
            <SelectContent>
              {assignOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={sort}
            onValueChange={(value) => {
              setSort(value as "NEWEST" | "OLDEST");
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>
            Showing {startIndex} to {endIndex} of {totalItems} cases
          </span>
          <div className="flex items-center gap-2">
            <span>Rows</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[90px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {isError ? (
        <ErrorPanel
          title="Unable to load cases."
          description="Please retry or adjust filters."
          onRetry={() => refetch()}
        />
      ) : isLoading ? (
        <TableSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          title="No cases found"
          description="Try adjusting filters or clearing the search to see more results."
          action={<Button onClick={clearFilters}>Clear filters</Button>}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-[0.4fr_2fr_1.5fr_1.5fr_1fr_1fr_1.2fr_1.2fr_1fr_1fr] gap-3 border-b bg-muted/40 px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">
            <span>
              <Checkbox
                checked={selectedIds.length === items.length}
                onCheckedChange={(checked) => selectAllOnPage(Boolean(checked))}
              />
            </span>
            <span>Applicant</span>
            <span>NIK</span>
            <span>Region</span>
            <span>Age</span>
            <span>Tag</span>
            <span>Status</span>
            <span>Signals</span>
            <span>Risk</span>
            <span>Assign</span>
          </div>
          <div className="divide-y">
            {items
              .filter((item) => {
                if (triageTag === "ALL") return true;
                if (triageTag === "NONE") return !item.triageTag;
                return item.triageTag === triageTag;
              })
              .filter((item) => {
                if (assigned === "ALL") return true;
                if (assigned === "ASSIGNED_TO_ME")
                  return item.assignedTo?.name === actorName;
                if (assigned === "UNASSIGNED") return !item.assignedTo;
                return true;
              })
              .map((item) => {
                const ageHours =
                  (new Date().getTime() - new Date(item.createdAt).getTime()) /
                  3600000;
                const slaBreached =
                  (item.status === "FALLBACK_REVIEW" ||
                    item.status === "EKYC_SUBMITTED") &&
                  ageHours > 48;

                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/cases/${item.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") navigate(`/cases/${item.id}`);
                    }}
                    className="grid cursor-pointer grid-cols-[0.4fr_2fr_1.5fr_1.5fr_1fr_1fr_1.2fr_1.2fr_1fr_1fr] items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/40"
                  >
                    <span onClick={(event) => event.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.includes(item.id)}
                        onCheckedChange={(checked) =>
                          toggleSelected(item.id, Boolean(checked))
                        }
                      />
                    </span>
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">
                        {item.applicant.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.id}
                      </span>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">
                      {maskNik(item.applicant.nik)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.applicant.region.province} /{" "}
                      {item.applicant.region.city}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatAge(ageHours)}</span>
                      {slaBreached ? (
                        <Badge variant="destructive">SLA</Badge>
                      ) : null}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {item.triageTag ? (
                        <Badge variant="outline">{item.triageTag}</Badge>
                      ) : (
                        "-"
                      )}
                    </span>
                    <StatusBadge status={item.status} />
                    <div className="flex flex-wrap gap-1">
                      <SignalBadge
                        type="faceMatch"
                        value={item.signals.faceMatch}
                      />
                      <SignalBadge
                        type="restriction"
                        value={item.signals.restriction}
                      />
                    </div>
                    <RiskBadge level={item.riskLevel} />
                    <div
                      className="flex items-center gap-2"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {item.assignedTo ? (
                        item.assignedTo.name === actorName ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => unassignMutation.mutate(item.id)}
                          >
                            Unassign
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Assigned to {item.assignedTo.name}
                          </span>
                        )
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => assignMutation.mutate(item.id)}
                        >
                          Assign to me
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              Page {data?.page ?? 1} of {data?.totalPages ?? 1}
              {isFetching ? " - Updating..." : ""}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={(data?.page ?? 1) <= 1}
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={(data?.page ?? 1) >= (data?.totalPages ?? 1)}
                onClick={() => setPage((prev) => prev + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save current view</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="View name"
              value={viewName}
              onChange={(event) => setViewName(event.target.value)}
            />
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={makeDefault}
                onCheckedChange={(checked) => setMakeDefault(Boolean(checked))}
              />
              Make default view on open
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveCurrentView} disabled={!viewName.trim()}>
              Save view
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage views</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {views.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No saved views.
              </div>
            ) : (
              views.map((view) => (
                <div key={view.id} className="flex items-center gap-2">
                  <Input
                    value={view.name}
                    onChange={(event) =>
                      handleRenameView({ ...view, name: event.target.value })
                    }
                  />
                  <Button
                    size="sm"
                    variant={view.isDefault ? "secondary" : "outline"}
                    onClick={() =>
                      handleRenameView({ ...view, isDefault: true })
                    }
                  >
                    Default
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteView(view.id)}
                  >
                    Delete
                  </Button>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setManageDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
