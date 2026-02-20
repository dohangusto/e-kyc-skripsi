import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import type { DecisionType } from "@/domain/types";
import type { AuditEvent } from "@/domain/entities/audit-event";
import { useRole } from "@/presentation/components/role-context";
import { PageHeader } from "@/presentation/components/page-header";
import { EmptyState } from "@/presentation/components/empty-state";
import { StatusBadge } from "@/presentation/components/status-badge";
import { RiskBadge } from "@/presentation/components/risk-badge";
import { SignalBadge } from "@/presentation/components/signal-badge";
import { DecisionDialog } from "@/presentation/components/decision-dialog";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/presentation/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/presentation/components/ui/tabs";
import { Skeleton } from "@/presentation/components/ui/skeleton";
import { caseUsecases } from "@/shared/lib/usecases";
import { formatDateTime } from "@/shared/lib/format-date-time";
import { maskNik } from "@/shared/lib/mask-nik";
import { NotFoundError } from "@/shared/lib/errors";

const livenessBadgeConfig = {
  PASS: { label: "Pass", variant: "secondary" as const },
  FAIL: { label: "Fail", variant: "destructive" as const },
  UNCERTAIN: { label: "Uncertain", variant: "outline" as const },
};

const ocrBadgeConfig = {
  CONSISTENT: { label: "Consistent", variant: "secondary" as const },
  INCONSISTENT: { label: "Inconsistent", variant: "destructive" as const },
};

const restrictionBadgeConfig = {
  FULL: { label: "Full", variant: "secondary" as const },
  LIMITED: { label: "Limited", variant: "outline" as const },
};

const eligibilityBadgeConfig = {
  ELIGIBLE: { label: "Eligible", variant: "secondary" as const },
  INELIGIBLE: { label: "Ineligible", variant: "destructive" as const },
};

const auditActionLabels: Record<AuditEvent["action"], string> = {
  CASE_VIEWED: "Case viewed",
  DECISION_APPROVED_MANUAL: "Approved (manual)",
  DECISION_REJECTED: "Rejected",
  DECISION_REQUEST_REVERIFY: "Requested re-verification",
};

export const CaseDetailPage = () => {
  const { id } = useParams();
  const { role } = useRole();
  const queryClient = useQueryClient();
  const [decisionType, setDecisionType] = useState<DecisionType | null>(null);
  const [showNik, setShowNik] = useState(false);

  const {
    data: caseDetail,
    isLoading: isCaseLoading,
    error: caseError,
    refetch: refetchCase,
  } = useQuery({
    queryKey: ["case", id],
    queryFn: () => caseUsecases.getCaseDetail(id ?? ""),
    enabled: Boolean(id),
  });

  const {
    data: auditEvents = [],
    isLoading: isAuditLoading,
    error: auditError,
    refetch: refetchAudit,
  } = useQuery({
    queryKey: ["case", id, "audit"],
    queryFn: () => caseUsecases.listAuditEvents(id ?? ""),
    enabled: Boolean(id),
  });

  const decisionMutation = useMutation({
    mutationFn: async (payload: {
      type: DecisionType;
      reasonCode: string;
      notes?: string;
    }) => {
      if (!id) throw new Error("Case id missing");
      return caseUsecases.decideCase(id, payload, {
        role,
        name: role === "VERIFIER" ? "Verifier 1" : "Supervisor 1",
      });
    },
    onSuccess: async () => {
      toast.success("Decision saved");
      setDecisionType(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["case", id] }),
        queryClient.invalidateQueries({ queryKey: ["case", id, "audit"] }),
      ]);
    },
    onError: () => {
      toast.error("Failed to save decision");
    },
  });

  const summaryNarrative = useMemo(() => {
    if (!caseDetail) return "";
    const notes: string[] = [];
    if (caseDetail.signals.faceMatch === "MISMATCH") {
      notes.push("Face match flagged a mismatch.");
    }
    if (caseDetail.signals.ocrConsistency === "INCONSISTENT") {
      notes.push("OCR fields show inconsistencies.");
    }
    if (
      caseDetail.signals.liveness === "UNCERTAIN" ||
      caseDetail.signals.liveness === "FAIL"
    ) {
      notes.push("Liveness needs additional verification.");
    }
    if (notes.length === 0) {
      return "Signals appear within expected thresholds. Review evidence for final confirmation.";
    }
    return notes.join(" ");
  }, [caseDetail]);

  if (isCaseLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (caseError instanceof NotFoundError) {
    return (
      <EmptyState
        title="Case not found"
        description="The requested case does not exist or is no longer available."
        action={
          <Button asChild>
            <Link to="/cases">Back to cases</Link>
          </Button>
        }
      />
    );
  }

  if (caseError || !caseDetail) {
    return (
      <EmptyState
        title="Unable to load case"
        description="Please retry to fetch the latest case information."
        action={<Button onClick={() => refetchCase()}>Retry</Button>}
      />
    );
  }

  const eligibilityBadge = eligibilityBadgeConfig[caseDetail.eligibility];
  const restrictionBadge =
    restrictionBadgeConfig[caseDetail.signals.restriction];
  const livenessBadge = livenessBadgeConfig[caseDetail.signals.liveness];
  const ocrBadge = ocrBadgeConfig[caseDetail.signals.ocrConsistency];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Case Review"
        description="eKYC evidence and decision"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {role === "SUPERVISOR" ? (
              <Badge variant="secondary">Read-only</Badge>
            ) : (
              <>
                <Button onClick={() => setDecisionType("APPROVE_MANUAL")}>
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setDecisionType("REJECT")}
                >
                  Reject
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setDecisionType("REQUEST_REVERIFY")}
                >
                  Request Re-Verification
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Applicant</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Name</div>
              <div className="font-medium text-foreground">
                {caseDetail.applicant.name}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">NIK</div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">
                  {role === "VERIFIER" && showNik
                    ? caseDetail.applicant.nik
                    : maskNik(caseDetail.applicant.nik)}
                </span>
                {role === "VERIFIER" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNik((prev) => !prev)}
                  >
                    {showNik ? "Hide" : "Reveal"}
                  </Button>
                ) : null}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Region</div>
              <div className="text-sm">
                {caseDetail.applicant.region.province} /{" "}
                {caseDetail.applicant.region.city}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Created</div>
              <div className="text-sm">
                {formatDateTime(caseDetail.createdAt)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={eligibilityBadge.variant}>
                {eligibilityBadge.label}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={caseDetail.status} />
              <RiskBadge level={caseDetail.riskLevel} />
              <Badge variant={restrictionBadge.variant}>
                {restrictionBadge.label} restriction
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              Updated{" "}
              {formatDateTime(caseDetail.updatedAt ?? caseDetail.createdAt)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Signals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <SignalBadge
                type="faceMatch"
                value={caseDetail.signals.faceMatch}
              />
              <Badge variant={livenessBadge.variant}>
                Liveness {livenessBadge.label}
              </Badge>
              <Badge variant={ocrBadge.variant}>OCR {ocrBadge.label}</Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              Face score:{" "}
              {caseDetail.evidence.faceMatch.score?.toFixed(2) ?? "-"} ·
              Liveness score:{" "}
              {caseDetail.evidence.liveness.score?.toFixed(2) ?? "-"}
            </div>
            {caseDetail.signals.faceMatch === "MISMATCH" ||
            caseDetail.signals.ocrConsistency === "INCONSISTENT" ? (
              <div className="text-xs text-destructive">
                Mismatch detected. Review evidence carefully before deciding.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="summary" className="w-full">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="evidence">Evidence</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>
        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Review Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>{summaryNarrative}</p>
              {caseDetail.evidence.ktpOcr.name !== caseDetail.applicant.name ||
              caseDetail.evidence.ktpOcr.nik !== caseDetail.applicant.nik ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                  OCR data differs from applicant input. Validate identity
                  fields before approving.
                </div>
              ) : null}
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-md border p-3">
                  <div className="text-xs font-medium text-foreground">
                    OCR (KTP)
                  </div>
                  <div className="mt-2 text-xs">
                    NIK: {caseDetail.evidence.ktpOcr.nik}
                  </div>
                  <div className="text-xs">
                    Name: {caseDetail.evidence.ktpOcr.name}
                  </div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs font-medium text-foreground">
                    Applicant
                  </div>
                  <div className="mt-2 text-xs">
                    NIK: {caseDetail.applicant.nik}
                  </div>
                  <div className="text-xs">
                    Name: {caseDetail.applicant.name}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="evidence" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>KTP OCR</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[2fr_1fr]">
              <div className="overflow-hidden rounded-lg border bg-muted/40">
                <img
                  src={caseDetail.evidence.ktpImageUrl}
                  alt="KTP"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    Confidence{" "}
                    {(caseDetail.evidence.ktpOcr.confidence * 100).toFixed(0)}%
                  </Badge>
                  {caseDetail.evidence.ktpOcr.flags?.map((flag) => (
                    <Badge key={flag} variant="outline">
                      {flag}
                    </Badge>
                  ))}
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div>NIK: {caseDetail.evidence.ktpOcr.nik}</div>
                  <div>Name: {caseDetail.evidence.ktpOcr.name}</div>
                  {caseDetail.evidence.ktpOcr.birthDate ? (
                    <div>
                      Birth date: {caseDetail.evidence.ktpOcr.birthDate}
                    </div>
                  ) : null}
                  {caseDetail.evidence.ktpOcr.address ? (
                    <div>Address: {caseDetail.evidence.ktpOcr.address}</div>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Selfie with KTP</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="overflow-hidden rounded-lg border bg-muted/40">
                <img
                  src={caseDetail.evidence.selfieWithKtpUrl}
                  alt="Selfie with KTP"
                  className="h-full w-full object-cover"
                />
              </div>
              <p>Fallback evidence when mismatch occurs.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Liveness</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={livenessBadge.variant}>
                  Result {livenessBadge.label}
                </Badge>
                <Badge variant="secondary">
                  Score {caseDetail.evidence.liveness.score?.toFixed(2) ?? "-"}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {caseDetail.evidence.liveness.gestures.map((gesture) => (
                  <Badge key={gesture} variant="outline">
                    {gesture}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="audit" className="space-y-4">
          {isAuditLoading ? (
            <Card className="space-y-3 p-6">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </Card>
          ) : auditError ? (
            <Card className="space-y-2 p-6">
              <div className="text-sm font-medium">
                Unable to load audit trail.
              </div>
              <Button onClick={() => refetchAudit()}>Retry</Button>
            </Card>
          ) : auditEvents.length === 0 ? (
            <EmptyState
              title="No audit events"
              description="Actions taken on this case will appear here."
              action={<Button onClick={() => refetchAudit()}>Refresh</Button>}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Audit Trail</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {auditEvents.map((event) => (
                  <div key={event.id} className="rounded-md border p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium">
                        {auditActionLabels[event.action]}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateTime(event.createdAt)}
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {event.actorName} · {event.actorRole}
                    </div>
                    {event.reasonCode ? (
                      <div className="mt-2 text-xs">
                        Reason: {event.reasonCode}
                      </div>
                    ) : null}
                    {event.notes ? (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Notes: {event.notes}
                      </div>
                    ) : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {decisionType ? (
        <DecisionDialog
          open={Boolean(decisionType)}
          decisionType={decisionType}
          onOpenChange={(open) => {
            if (!open) setDecisionType(null);
          }}
          onConfirm={(payload) =>
            decisionMutation.mutate({
              type: decisionType,
              reasonCode: payload.reasonCode,
              notes: payload.notes,
            })
          }
          isSubmitting={decisionMutation.isPending}
        />
      ) : null}
    </div>
  );
};
