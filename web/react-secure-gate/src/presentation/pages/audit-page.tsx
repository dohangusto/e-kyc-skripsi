import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AuditEvent } from "@/domain/entities/audit-event";
import type { Role } from "@/domain/types";
import { PageHeader } from "@/presentation/components/page-header";
import { EmptyState } from "@/presentation/components/empty-state";
import { ActionBadge } from "@/presentation/components/action-badge";
import { Badge } from "@/presentation/components/ui/badge";
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
import { auditUsecases } from "@/shared/lib/usecases";
import { formatDateTime } from "@/shared/lib/format-date-time";
import { truncate } from "@/shared/lib/truncate";

const roleOptions: Array<{ label: string; value: "ALL" | Role }> = [
  { label: "All roles", value: "ALL" },
  { label: "Verifier", value: "VERIFIER" },
  { label: "Supervisor", value: "SUPERVISOR" },
];

const actionOptions: Array<{ label: string; value: "ALL" | AuditEvent["action"] }> = [
  { label: "All actions", value: "ALL" },
  { label: "Case viewed", value: "CASE_VIEWED" },
  { label: "Approved manually", value: "DECISION_APPROVED_MANUAL" },
  { label: "Rejected", value: "DECISION_REJECTED" },
  { label: "Requested re-verification", value: "DECISION_REQUEST_REVERIFY" },
];

const sortOptions = [
  { label: "Newest", value: "NEWEST" },
  { label: "Oldest", value: "OLDEST" },
] as const;

const pageSizeOptions = [10, 20, 50];

export const AuditPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [role, setRole] = useState<"ALL" | Role>("ALL");
  const [action, setAction] = useState<"ALL" | AuditEvent["action"]>("ALL");
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
      actorRole: role,
      action,
      sort,
    }),
    [page, pageSize, debouncedSearch, role, action, sort]
  );

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["audit", queryParams],
    queryFn: () => auditUsecases.listAuditEvents(queryParams),
    placeholderData: keepPreviousData,
  });

  const totalItems = data?.totalItems ?? 0;
  const items = data?.items ?? [];
  const currentPage = data?.page ?? page;
  const currentPageSize = data?.pageSize ?? pageSize;
  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * currentPageSize + 1;
  const endIndex = totalItems === 0 ? 0 : startIndex + items.length - 1;

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setRole("ALL");
    setAction("ALL");
    setSort("NEWEST");
    setPageSize(20);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="System activity across verification cases"
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Refresh
          </Button>
        }
      />

      <Card className="space-y-4 p-4">
        <div className="grid gap-3 lg:grid-cols-[2fr_repeat(4,1fr)]">
          <Input
            placeholder="Search actor, reason, notes, case ID..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <Select value={role} onValueChange={(value) => {
            setRole(value as "ALL" | Role);
            setPage(1);
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              {roleOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={action} onValueChange={(value) => {
            setAction(value as "ALL" | AuditEvent["action"]);
            setPage(1);
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              {actionOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(value) => {
            setSort(value as "NEWEST" | "OLDEST");
            setPage(1);
          }}>
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
          <Select value={String(pageSize)} onValueChange={(value) => {
            setPageSize(Number(value));
            setPage(1);
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Rows" />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size} / page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>Showing {startIndex} to {endIndex} of {totalItems} events</span>
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      </Card>

      {isError ? (
        <Card className="space-y-2 p-6">
          <div className="text-sm font-medium">Unable to load audit events.</div>
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
          title="No audit events found"
          description="Try adjusting filters or clearing the search."
          action={<Button onClick={clearFilters}>Clear filters</Button>}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-[1.4fr_1.4fr_1.6fr_1.2fr_1.2fr_2fr] gap-3 border-b bg-muted/40 px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">
            <span>Time</span>
            <span>Actor</span>
            <span>Action</span>
            <span>Case ID</span>
            <span>Reason</span>
            <span>Notes</span>
          </div>
          <div className="divide-y">
            {items.map((event) => (
              <div
                key={event.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/cases/${event.caseId}`)}
                onKeyDown={(eventKey) => {
                  if (eventKey.key === "Enter") navigate(`/cases/${event.caseId}`);
                }}
                className="grid cursor-pointer grid-cols-[1.4fr_1.4fr_1.6fr_1.2fr_1.2fr_2fr] items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/40"
              >
                <span className="text-xs text-muted-foreground">{formatDateTime(event.createdAt)}</span>
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">{event.actorName}</span>
                  <Badge variant="outline" className="w-fit text-[10px]">
                    {event.actorRole}
                  </Badge>
                </div>
                <ActionBadge action={event.action} />
                <span className="font-mono text-xs text-muted-foreground">{event.caseId}</span>
                <span className="text-xs text-muted-foreground">
                  {event.reasonCode ? <Badge variant="outline">{event.reasonCode}</Badge> : "-"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {event.notes ? truncate(event.notes, 80) : "-"}
                </span>
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
