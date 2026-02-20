import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
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
import { Skeleton } from "@/presentation/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/presentation/components/ui/select";
import { caseUsecases } from "@/shared/lib/usecases";
import { formatDateTime } from "@/shared/lib/format-date-time";
import { maskNik } from "@/shared/lib/mask-nik";

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

const sortOptions = [
  { label: "Newest", value: "NEWEST" },
  { label: "Oldest", value: "OLDEST" },
] as const;

const pageSizeOptions = [10, 20, 50];

export const CasesPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<CaseStatus | "ALL">("ALL");
  const [eligibility, setEligibility] = useState<"ALL" | Eligibility>("ALL");
  const [faceMatch, setFaceMatch] = useState<"ALL" | FaceMatch>("ALL");
  const [riskLevel, setRiskLevel] = useState<"ALL" | RiskLevel>("ALL");
  const [sort, setSort] = useState<"NEWEST" | "OLDEST">("NEWEST");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);

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

  const totalItems = data?.totalItems ?? 0;
  const items = data?.items ?? [];
  const currentPage = data?.page ?? page;
  const currentPageSize = data?.pageSize ?? pageSize;
  const startIndex =
    totalItems === 0 ? 0 : (currentPage - 1) * currentPageSize + 1;
  const endIndex = totalItems === 0 ? 0 : startIndex + items.length - 1;

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatus("ALL");
    setEligibility("ALL");
    setFaceMatch("ALL");
    setRiskLevel("ALL");
    setSort("NEWEST");
    setPageSize(20);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Verification Cases"
        description="Queue for eligibility and eKYC review"
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Refresh
          </Button>
        }
      />

      <Card className="space-y-4 p-4">
        <div className="grid gap-3 lg:grid-cols-[2fr_repeat(5,1fr)]">
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
        <Card className="space-y-3 p-6">
          <div className="text-sm font-medium">Unable to load cases.</div>
          <div className="text-sm text-muted-foreground">
            Please retry or adjust filters.
          </div>
          <Button onClick={() => refetch()}>Retry</Button>
        </Card>
      ) : isLoading ? (
        <Card className="space-y-3 p-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </Card>
      ) : items.length === 0 ? (
        <EmptyState
          title="No cases found"
          description="Try adjusting filters or clearing the search to see more results."
          action={<Button onClick={clearFilters}>Clear filters</Button>}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-[2fr_1.5fr_1.5fr_1.5fr_1.2fr_1.2fr_1fr] gap-3 border-b bg-muted/40 px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">
            <span>Applicant</span>
            <span>NIK</span>
            <span>Region</span>
            <span>Created</span>
            <span>Status</span>
            <span>Signals</span>
            <span>Risk</span>
          </div>
          <div className="divide-y">
            {items.map((item) => (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/cases/${item.id}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") navigate(`/cases/${item.id}`);
                }}
                className="grid cursor-pointer grid-cols-[2fr_1.5fr_1.5fr_1.5fr_1.2fr_1.2fr_1fr] items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/40"
              >
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
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(item.createdAt)}
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
              </div>
            ))}
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
    </div>
  );
};
