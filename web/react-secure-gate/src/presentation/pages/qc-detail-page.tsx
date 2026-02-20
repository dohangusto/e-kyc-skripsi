import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import type { QCVerdict } from "@/domain/types";
import { PageHeader } from "@/presentation/components/page-header";
import { EmptyState } from "@/presentation/components/empty-state";
import { ErrorPanel } from "@/presentation/components/error-panel";
import { TableSkeleton } from "@/presentation/components/table-skeleton";
import { Button } from "@/presentation/components/ui/button";
import { Card } from "@/presentation/components/ui/card";
import { Badge } from "@/presentation/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { Textarea } from "@/presentation/components/ui/textarea";
import { qcUsecases, caseUsecases } from "@/shared/lib/usecases";
import { formatDateTime } from "@/shared/lib/format-date-time";
import { StatusBadge } from "@/presentation/components/status-badge";
import { useRole } from "@/presentation/components/role-context";
import { NotFoundError } from "@/shared/lib/errors";

const verdictOptions: Array<{ label: string; value: QCVerdict }> = [
  { label: "Pass", value: "PASS" },
  { label: "Fail", value: "FAIL" },
  { label: "Needs follow-up", value: "NEEDS_FOLLOWUP" },
];

const verdictBadge: Record<
  QCVerdict,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  PASS: { label: "Pass", variant: "secondary" },
  FAIL: { label: "Fail", variant: "destructive" },
  NEEDS_FOLLOWUP: { label: "Needs follow-up", variant: "outline" },
};

type ReviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: { verdict: QCVerdict; notes?: string }) => void;
  isSubmitting?: boolean;
};

const ReviewDialog = ({
  open,
  onOpenChange,
  onConfirm,
  isSubmitting,
}: ReviewDialogProps) => {
  const [verdict, setVerdict] = useState<QCVerdict | "">("");
  const [notes, setNotes] = useState("");
  const notesRequired = verdict === "FAIL" || verdict === "NEEDS_FOLLOWUP";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record QC Verdict</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Verdict</label>
            <Select
              value={verdict}
              onValueChange={(value) => setVerdict(value as QCVerdict)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select verdict" />
              </SelectTrigger>
              <SelectContent>
                {verdictOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Notes ({notesRequired ? "required" : "optional"})
            </label>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add review notes"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onConfirm({
                verdict: verdict as QCVerdict,
                notes: notes.trim() || undefined,
              })
            }
            disabled={
              !verdict ||
              (notesRequired && notes.trim().length === 0) ||
              isSubmitting
            }
          >
            Save verdict
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const SampleCaseRow = ({
  caseId,
  verdict,
  onReview,
}: {
  caseId: string;
  verdict?: { verdict: QCVerdict; reviewedAt: string };
  onReview: () => void;
}) => {
  const { data: detail } = useQuery({
    queryKey: ["case", caseId],
    queryFn: () => caseUsecases.getCaseDetail(caseId),
  });

  return (
    <div className="grid grid-cols-[1.4fr_1.4fr_1fr_1fr_1fr] items-center gap-3 px-4 py-3 text-sm">
      <span className="font-mono text-xs text-muted-foreground">{caseId}</span>
      <span className="text-sm text-muted-foreground">
        {detail ? detail.applicant.name : "Loading..."}
      </span>
      <div>{detail ? <StatusBadge status={detail.status} /> : "-"}</div>
      <div>
        {verdict ? (
          <Badge variant={verdictBadge[verdict.verdict].variant}>
            {verdictBadge[verdict.verdict].label}
          </Badge>
        ) : (
          <Badge variant="outline">Not reviewed</Badge>
        )}
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to={`/cases/${caseId}`} target="_blank" rel="noreferrer">
            View case
          </Link>
        </Button>
        <Button size="sm" onClick={onReview}>
          Review
        </Button>
      </div>
    </div>
  );
};

export const QCDetailPage = () => {
  const { id } = useParams();
  const { role, actorName } = useRole();
  const queryClient = useQueryClient();
  const [reviewCaseId, setReviewCaseId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["qc", id],
    queryFn: () => qcUsecases.getSample(id ?? ""),
    enabled: Boolean(id),
  });

  const mutation = useMutation({
    mutationFn: async (payload: {
      caseId: string;
      verdict: QCVerdict;
      notes?: string;
    }) => {
      if (!id) throw new Error("Sample id missing");
      return qcUsecases.recordReview(
        id,
        payload.caseId,
        {
          verdict: payload.verdict,
          notes: payload.notes,
        },
        { role, name: actorName },
      );
    },
    onSuccess: async () => {
      toast.success("QC review saved");
      setReviewCaseId(null);
      await queryClient.invalidateQueries({ queryKey: ["qc", id] });
    },
    onError: () => toast.error("Failed to save QC review"),
  });

  if (isLoading) return <TableSkeleton rows={6} />;

  if (error instanceof NotFoundError) {
    return (
      <EmptyState
        title="QC sample not found"
        description="This sample no longer exists."
        action={
          <Button asChild>
            <Link to="/qc">Back to QC</Link>
          </Button>
        }
      />
    );
  }

  if (isError || !data) {
    return (
      <ErrorPanel
        title="Unable to load QC sample."
        description="Please retry."
        onRetry={() => refetch()}
      />
    );
  }

  const reviewedCount = data.results.length;
  const totalCount = data.caseIds.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`QC Sample ${data.id}`}
        description="Review sampled cases and record QC verdicts"
        actions={
          <Badge variant="outline">
            {reviewedCount} / {totalCount} reviewed
          </Badge>
        }
      />

      <Card className="space-y-2 p-4 text-sm text-muted-foreground">
        <div>Created: {formatDateTime(data.createdAt)}</div>
        <div>
          By: {data.createdBy.name} · {data.createdBy.role}
        </div>
        <div>
          Range: {formatDateTime(data.criteria.fromDateISO)} →{" "}
          {formatDateTime(data.criteria.toDateISO)}
        </div>
        <div>Statuses: {data.criteria.statuses.join(", ")}</div>
        <div>Sample size: {data.criteria.sampleSize}</div>
      </Card>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-[1.4fr_1.4fr_1fr_1fr_1fr] gap-3 border-b bg-muted/40 px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">
          <span>Case ID</span>
          <span>Applicant</span>
          <span>Status</span>
          <span>QC Verdict</span>
          <span></span>
        </div>
        <div className="divide-y">
          {data.caseIds.map((caseId) => {
            const existing = data.results.find(
              (result) => result.caseId === caseId,
            );
            return (
              <SampleCaseRow
                key={caseId}
                caseId={caseId}
                verdict={
                  existing
                    ? {
                        verdict: existing.verdict,
                        reviewedAt: existing.reviewedAt,
                      }
                    : undefined
                }
                onReview={() => setReviewCaseId(caseId)}
              />
            );
          })}
        </div>
      </Card>

      {reviewCaseId ? (
        <ReviewDialog
          open={Boolean(reviewCaseId)}
          onOpenChange={(open) => {
            if (!open) setReviewCaseId(null);
          }}
          onConfirm={(payload) =>
            mutation.mutate({ caseId: reviewCaseId, ...payload })
          }
          isSubmitting={mutation.isPending}
        />
      ) : null}
    </div>
  );
};
