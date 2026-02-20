import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { CaseStatus } from "@/domain/types";
import { PageHeader } from "@/presentation/components/page-header";
import { Button } from "@/presentation/components/ui/button";
import { Card } from "@/presentation/components/ui/card";
import { TableSkeleton } from "@/presentation/components/table-skeleton";
import { ErrorPanel } from "@/presentation/components/error-panel";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/presentation/components/ui/dialog";
import { Checkbox } from "@/presentation/components/ui/checkbox";
import { Input } from "@/presentation/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/presentation/components/ui/select";
import { qcUsecases } from "@/shared/lib/usecases";
import { formatDateTime } from "@/shared/lib/format-date-time";
import { useRole } from "@/presentation/components/role-context";

const terminalStatuses: CaseStatus[] = [
  "APPROVED_MANUAL",
  "REJECTED",
  "NEED_REVERIFY",
];

const statusOptions: Array<{ label: string; value: CaseStatus }> = [
  { label: "Approved manual", value: "APPROVED_MANUAL" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Need reverify", value: "NEED_REVERIFY" },
];

const rangeOptions = [
  { label: "Last 1 day", days: 1 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
];

const pageSizeOptions = [10, 20, 50];

export const QCPage = () => {
  const navigate = useNavigate();
  const { role, actorName } = useRole();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [openDialog, setOpenDialog] = useState(false);
  const [rangeDays, setRangeDays] = useState(7);
  const [sampleSize, setSampleSize] = useState(10);
  const [statuses, setStatuses] = useState<CaseStatus[]>(terminalStatuses);

  const queryParams = useMemo(() => ({ page, pageSize }), [page, pageSize]);

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["qc", "samples", queryParams],
    queryFn: () => qcUsecases.listSamples(queryParams),
    placeholderData: keepPreviousData,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const from = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);
      return qcUsecases.createSample(
        {
          fromDateISO: from.toISOString(),
          toDateISO: now.toISOString(),
          sampleSize,
          statuses,
        },
        { role, name: actorName },
      );
    },
    onSuccess: (sample) => {
      toast.success("QC sample created");
      setOpenDialog(false);
      navigate(`/qc/${sample.id}`);
    },
    onError: () => {
      toast.error("Failed to create sample");
    },
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="QC Sampling"
        description="Random review of verification decisions"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Refresh
            </Button>
            <Button size="sm" onClick={() => setOpenDialog(true)}>
              Create sample
            </Button>
          </div>
        }
      />

      {isError ? (
        <ErrorPanel
          title="Unable to load QC samples."
          description="Please retry."
          onRetry={() => refetch()}
        />
      ) : isLoading ? (
        <TableSkeleton />
      ) : (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-[1.4fr_2fr_1fr_1fr] gap-3 border-b bg-muted/40 px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">
            <span>Created</span>
            <span>Criteria</span>
            <span>Reviewed</span>
            <span></span>
          </div>
          <div className="divide-y">
            {items.map((sample) => (
              <div
                key={sample.id}
                className="grid grid-cols-[1.4fr_2fr_1fr_1fr] items-center gap-3 px-4 py-3 text-sm"
              >
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(sample.createdAt)}
                </span>
                <div className="text-xs text-muted-foreground">
                  {formatDateTime(sample.criteria.fromDateISO)} →{" "}
                  {formatDateTime(sample.criteria.toDateISO)} ·
                  {sample.criteria.statuses.join(", ")} · size{" "}
                  {sample.criteria.sampleSize}
                </div>
                <span className="text-xs text-muted-foreground">
                  {sample.results.length} / {sample.caseIds.length}
                </span>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/qc/${sample.id}`)}
                  >
                    Open
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              Page {data?.page ?? 1} of {data?.totalPages ?? 1}
              {isFetching ? " - Updating..." : ""}
            </span>
            <div className="flex items-center gap-2">
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[110px]">
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

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create QC Sample</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date range</label>
              <Select
                value={String(rangeDays)}
                onValueChange={(value) => setRangeDays(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  {rangeOptions.map((option) => (
                    <SelectItem key={option.days} value={String(option.days)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sample size</label>
              <Input
                type="number"
                min={1}
                value={sampleSize}
                onChange={(event) => setSampleSize(Number(event.target.value))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Statuses</label>
              <div className="space-y-2">
                {statusOptions.map((status) => (
                  <label
                    key={status.value}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={statuses.includes(status.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setStatuses((prev) => [...prev, status.value]);
                        } else {
                          setStatuses((prev) =>
                            prev.filter((item) => item !== status.value),
                          );
                        }
                      }}
                    />
                    {status.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={
                statuses.length === 0 || sampleSize <= 0 || mutation.isPending
              }
            >
              Create sample
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
