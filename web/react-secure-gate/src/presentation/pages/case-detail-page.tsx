import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "@/presentation/components/page-header";
import { EmptyState } from "@/presentation/components/empty-state";
import { StatusBadge } from "@/presentation/components/status-badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/presentation/components/ui/card";
import { caseUsecases } from "@/shared/lib/usecases";
import { Button } from "@/presentation/components/ui/button";

export const CaseDetailPage = () => {
  const { id } = useParams();

  const { data: caseDetail, isLoading: isCaseLoading } = useQuery({
    queryKey: ["case", id],
    queryFn: () => caseUsecases.getCaseDetail(id ?? ""),
    enabled: Boolean(id),
  });

  const { data: auditEvents = [], isLoading: isAuditLoading } = useQuery({
    queryKey: ["case", id, "audit"],
    queryFn: () => caseUsecases.listAuditEvents(id ?? ""),
    enabled: Boolean(id),
  });

  if (isCaseLoading) {
    return <div className="text-sm text-muted-foreground">Loading case...</div>;
  }

  if (!caseDetail) {
    return (
      <EmptyState
        title="Case not found"
        description="The requested case does not exist or is no longer available."
        action={
          <Button asChild>
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Case ${caseDetail.id}`}
        description="Review applicant details and verification signals."
        actions={<StatusBadge status={caseDetail.status} />}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Applicant</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">Name:</span>{" "}
              {caseDetail.applicant.fullName}
            </div>
            <div>
              <span className="font-medium text-foreground">National ID:</span>{" "}
              {caseDetail.applicant.nationalId}
            </div>
            <div>
              <span className="font-medium text-foreground">DOB:</span>{" "}
              {caseDetail.applicant.dateOfBirth}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Signals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">Face Match:</span>{" "}
              {caseDetail.signals.faceMatch}
            </div>
            <div>
              <span className="font-medium text-foreground">Liveness:</span>{" "}
              {caseDetail.signals.liveness}
            </div>
            <div>
              <span className="font-medium text-foreground">OCR:</span>{" "}
              {caseDetail.signals.ocrConsistency}
            </div>
            <div>
              <span className="font-medium text-foreground">Restriction:</span>{" "}
              {caseDetail.signals.restriction}
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isAuditLoading ? (
            <div className="text-sm text-muted-foreground">
              Loading audit events...
            </div>
          ) : auditEvents.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No audit events recorded.
            </div>
          ) : (
            auditEvents.map((event) => (
              <div
                key={event.id}
                className="rounded-md border px-3 py-2 text-sm"
              >
                <div className="font-medium">{event.actor}</div>
                <div className="text-muted-foreground">{event.message}</div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};
