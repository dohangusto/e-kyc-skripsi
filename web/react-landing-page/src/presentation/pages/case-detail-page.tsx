import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
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
import { PiiRevealGate } from "@/presentation/components/pii-reveal-gate";
import { DecisionDialog } from "@/presentation/components/decision-dialog";
import { useFeatureFlags } from "@/presentation/components/feature-flags-context";
import { CardShell } from "@/presentation/components/card-shell";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import {
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
import { Separator } from "@/presentation/components/ui/separator";
import { Skeleton } from "@/presentation/components/ui/skeleton";
import { DetailSkeleton } from "@/presentation/components/detail-skeleton";
import { caseUsecases, auditUsecases } from "@/shared/lib/usecases";
import { formatDateTime } from "@/shared/lib/format-date-time";
import { maskNik } from "@/shared/lib/mask-nik";
import { NotFoundError } from "@/shared/lib/errors";

const livenessBadgeConfig = {
  PASS: {
    label: "Pass",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  FAIL: { label: "Fail", className: "border-red-200 bg-red-50 text-red-700" },
  UNCERTAIN: {
    label: "Uncertain",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
};

const ocrBadgeConfig = {
  CONSISTENT: {
    label: "Consistent",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  INCONSISTENT: {
    label: "Inconsistent",
    className: "border-red-200 bg-red-50 text-red-700",
  },
};

const restrictionBadgeConfig = {
  FULL: {
    label: "Full",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  LIMITED: {
    label: "Limited",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
};

const eligibilityBadgeConfig = {
  ELIGIBLE: {
    label: "Eligible",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  INELIGIBLE: {
    label: "Ineligible",
    className: "border-red-200 bg-red-50 text-red-700",
  },
};

const auditActionLabels: Record<AuditEvent["action"], string> = {
  CASE_VIEWED: "Case viewed",
  DECISION_APPROVED_MANUAL: "Approved (manual)",
  DECISION_REJECTED: "Rejected",
  DECISION_REQUEST_REVERIFY: "Requested re-verification",
  PII_REVEALED: "PII revealed",
  QC_SAMPLE_CREATED: "QC sample created",
  QC_REVIEW_RECORDED: "QC review recorded",
};

const bannerStyles = {
  amber: "border-amber-200 bg-amber-50 text-amber-900",
  red: "border-red-200 bg-red-50 text-red-900",
  slate: "border-slate-200 bg-slate-50 text-slate-800",
};

const Banner = ({
  tone,
  text,
}: {
  tone: keyof typeof bannerStyles;
  text: string;
}) => (
  <div className={`rounded-md border px-4 py-3 text-sm ${bannerStyles[tone]}`}>
    {text}
  </div>
);

const scoreBarStyles = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  blue: "bg-blue-500",
};

const ScoreBar = ({
  value,
  tone,
}: {
  value?: number;
  tone: keyof typeof scoreBarStyles;
}) => {
  const safeValue = typeof value === "number" ? value : 0;
  const width = Math.min(Math.max(safeValue * 100, 0), 100);
  return (
    <div className="space-y-1">
      <div className="h-2 w-full rounded-full bg-muted">
        <div
          className={`h-2 rounded-full ${scoreBarStyles[tone]}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <div className="text-xs text-muted-foreground">
        {typeof value === "number" ? `${(value * 100).toFixed(0)}%` : "N/A"}
      </div>
    </div>
  );
};

export const CaseDetailPage = () => {
  const { id } = useParams();
  const { role, actorName } = useRole();
  const { flags } = useFeatureFlags();
  const queryClient = useQueryClient();
  const [decisionType, setDecisionType] = useState<DecisionType | null>(null);

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
        name: actorName,
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

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Case id missing");
      return caseUsecases.assignCase(id, { role, name: actorName });
    },
    onSuccess: async () => {
      toast.success("Assigned to you");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["case", id] }),
        queryClient.invalidateQueries({ queryKey: ["case", id, "audit"] }),
      ]);
    },
    onError: () => {
      toast.error("Failed to assign case");
    },
  });

  const unassignMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Case id missing");
      return caseUsecases.unassignCase(id, { role, name: actorName });
    },
    onSuccess: async () => {
      toast.success("Unassigned");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["case", id] }),
        queryClient.invalidateQueries({ queryKey: ["case", id, "audit"] }),
      ]);
    },
    onError: () => {
      toast.error("Failed to unassign case");
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

  useEffect(() => {
    if (!id) return;
    const key = `case_viewed::${id}::${role}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "true");
    auditUsecases.recordAuditEvent({
      id: `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      caseId: id,
      actorRole: role,
      actorName,
      action: "CASE_VIEWED",
      createdAt: new Date().toISOString(),
    });
  }, [id, role, actorName]);

  if (isCaseLoading) {
    return <DetailSkeleton />;
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
  const isTerminal = ["APPROVED_MANUAL", "REJECTED", "NEED_REVERIFY"].includes(
    caseDetail.status,
  );
  const isVerifier = role === "VERIFIER";
  const isUnassigned = !caseDetail.assignedTo?.name;
  const isOwnedByMe = caseDetail.assignedTo?.name === actorName;
  const isOwnedByOther = Boolean(caseDetail.assignedTo?.name) && !isOwnedByMe;
  const canDecide =
    isVerifier &&
    isOwnedByMe &&
    ["FALLBACK_REVIEW", "EKYC_SUBMITTED"].includes(caseDetail.status);
  const canManualApprove = canDecide && flags.enableManualApprove;
  const actor = { role, name: actorName };

  const handleDecisionOpen = (type: DecisionType) => {
    if (!isOwnedByMe) {
      toast.error(
        isUnassigned
          ? "Assign the case to yourself to make a decision."
          : `This case is assigned to ${caseDetail.assignedTo?.name}.`,
      );
      return;
    }
    if (type === "APPROVE_MANUAL" && !flags.enableManualApprove) {
      toast.error("Manual approval is disabled by policy.");
      return;
    }
    setDecisionType(type);
  };

  const statusBanners = [
    (caseDetail.status === "FALLBACK_REVIEW" ||
      caseDetail.signals.faceMatch === "MISMATCH") && {
      tone: "amber" as const,
      text: "Manual review required: face mismatch.",
    },
    caseDetail.signals.liveness === "FAIL" && {
      tone: "red" as const,
      text: "High risk: liveness failed.",
    },
    caseDetail.eligibility === "INELIGIBLE" && {
      tone: "amber" as const,
      text: "Not eligible.",
    },
    caseDetail.signals.restriction === "LIMITED" && {
      tone: "slate" as const,
      text: "User has limited access.",
    },
  ].filter(Boolean) as Array<{ tone: keyof typeof bannerStyles; text: string }>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Case Review"
        description="eKYC evidence and decision"
        actions={
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card/80 p-2 shadow-sm">
            {role === "SUPERVISOR" ? (
              <Badge variant="secondary">Read-only</Badge>
            ) : null}
            {isVerifier && !isTerminal && isUnassigned ? (
              <>
                <Button
                  onClick={() => assignMutation.mutate()}
                  disabled={assignMutation.isPending}
                >
                  Assign to me
                </Button>
                <Button
                  onClick={() => handleDecisionOpen("APPROVE_MANUAL")}
                  disabled={!canManualApprove}
                  title={
                    !flags.enableManualApprove
                      ? "Disabled by policy"
                      : "Assign to proceed"
                  }
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDecisionOpen("REJECT")}
                  disabled={!canDecide}
                  title="Assign to proceed"
                >
                  Reject
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDecisionOpen("REQUEST_REVERIFY")}
                  disabled={!canDecide}
                  title="Assign to proceed"
                  className="border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                  Request Re-Verification
                </Button>
              </>
            ) : null}
            {isVerifier && !isTerminal && isOwnedByMe ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => unassignMutation.mutate()}
                  disabled={unassignMutation.isPending}
                  className="text-muted-foreground"
                >
                  Unassign
                </Button>
                <Button
                  onClick={() => handleDecisionOpen("APPROVE_MANUAL")}
                  disabled={!canManualApprove}
                  title={
                    !flags.enableManualApprove
                      ? "Disabled by policy"
                      : undefined
                  }
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDecisionOpen("REJECT")}
                  disabled={!canDecide}
                >
                  Reject
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDecisionOpen("REQUEST_REVERIFY")}
                  disabled={!canDecide}
                  className="border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                  Request Re-Verification
                </Button>
              </>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>Owner:</span>
        <Badge variant="outline">
          {caseDetail.assignedTo?.name ?? "Unassigned"}
        </Badge>
      </div>

      <div className="space-y-2">
        {isTerminal ? (
          <Banner tone="slate" text="This case is already finalized." />
        ) : null}
        {isOwnedByOther && isVerifier ? (
          <Banner
            tone="red"
            text={`Assigned to ${caseDetail.assignedTo?.name}. You cannot make decisions.`}
          />
        ) : null}
        {statusBanners.map((banner) => (
          <Banner key={banner.text} tone={banner.tone} text={banner.text} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <CardShell>
          <CardHeader>
            <CardTitle>Applicant</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Name</div>
              <div className="text-base font-semibold text-foreground">
                {caseDetail.applicant.name}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">NIK</div>
              <PiiRevealGate
                label=""
                maskedValue={maskNik(caseDetail.applicant.nik)}
                fullValue={caseDetail.applicant.nik}
                caseId={caseDetail.id}
                fieldKey="NIK"
                actor={actor}
                allowReveal={role === "VERIFIER"}
                policyDisabled={!flags.enablePIIReveal}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-xs text-muted-foreground">Region</div>
                <div className="text-sm font-medium">
                  {caseDetail.applicant.region.province} /{" "}
                  {caseDetail.applicant.region.city}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Created</div>
                <div className="text-sm font-medium">
                  {formatDateTime(caseDetail.createdAt)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={eligibilityBadge.className}>
                {eligibilityBadge.label}
              </Badge>
            </div>
          </CardContent>
        </CardShell>

        <div className="space-y-4">
          <CardShell>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={caseDetail.status} />
                <RiskBadge level={caseDetail.riskLevel} />
                <Badge variant="outline" className={restrictionBadge.className}>
                  {restrictionBadge.label} restriction
                </Badge>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div>
                  Updated{" "}
                  {formatDateTime(caseDetail.updatedAt ?? caseDetail.createdAt)}
                </div>
                <div>Case ID: {caseDetail.id}</div>
              </div>
            </CardContent>
          </CardShell>

          <CardShell>
            <CardHeader>
              <CardTitle>Signals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <SignalBadge
                  type="faceMatch"
                  value={caseDetail.signals.faceMatch}
                />
                <Badge variant="outline" className={livenessBadge.className}>
                  Liveness {livenessBadge.label}
                </Badge>
                <Badge variant="outline" className={ocrBadge.className}>
                  OCR {ocrBadge.label}
                </Badge>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-muted-foreground">
                    Face match score
                  </div>
                  <ScoreBar
                    value={caseDetail.evidence.faceMatch.score}
                    tone={
                      caseDetail.signals.faceMatch === "MISMATCH"
                        ? "red"
                        : caseDetail.signals.faceMatch === "MATCH"
                          ? "emerald"
                          : "amber"
                    }
                  />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">
                    Liveness score
                  </div>
                  <ScoreBar
                    value={caseDetail.evidence.liveness.score}
                    tone={
                      caseDetail.signals.liveness === "FAIL"
                        ? "red"
                        : caseDetail.signals.liveness === "PASS"
                          ? "emerald"
                          : "amber"
                    }
                  />
                </div>
              </div>
              {caseDetail.signals.faceMatch === "MISMATCH" ||
              caseDetail.signals.ocrConsistency === "INCONSISTENT" ? (
                <div className="text-xs text-destructive">
                  Mismatch detected. Review evidence carefully before deciding.
                </div>
              ) : null}
            </CardContent>
          </CardShell>
        </div>
      </div>

      <Tabs defaultValue="summary" className="w-full space-y-4">
        <TabsList className="bg-muted/40">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="evidence">Evidence</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>
        <TabsContent value="summary">
          <CardShell className="space-y-4 p-6">
            <div className="text-base font-semibold">Review Summary</div>
            <div className="text-sm text-muted-foreground">
              {summaryNarrative}
            </div>
            {caseDetail.evidence.ktpOcr.name !== caseDetail.applicant.name ||
            caseDetail.evidence.ktpOcr.nik !== caseDetail.applicant.nik ? (
              <Banner
                tone="amber"
                text="OCR data differs from applicant input. Validate identity fields before approving."
              />
            ) : null}
            <Separator />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="text-xs font-medium text-foreground">
                  OCR (KTP)
                </div>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <PiiRevealGate
                    label="NIK"
                    maskedValue={maskNik(caseDetail.evidence.ktpOcr.nik)}
                    fullValue={caseDetail.evidence.ktpOcr.nik}
                    caseId={caseDetail.id}
                    fieldKey="OCR_NIK"
                    actor={actor}
                    allowReveal={role === "VERIFIER"}
                    policyDisabled={!flags.enablePIIReveal}
                  />
                  <PiiRevealGate
                    label="Name"
                    maskedValue={maskNik(caseDetail.evidence.ktpOcr.name)}
                    fullValue={caseDetail.evidence.ktpOcr.name}
                    caseId={caseDetail.id}
                    fieldKey="OCR_NAME"
                    actor={actor}
                    allowReveal={role === "VERIFIER"}
                    policyDisabled={!flags.enablePIIReveal}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-medium text-foreground">
                  Applicant
                </div>
                <div className="text-xs text-muted-foreground">
                  NIK: {maskNik(caseDetail.applicant.nik)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Name: {caseDetail.applicant.name}
                </div>
              </div>
            </div>
          </CardShell>
        </TabsContent>
        <TabsContent value="evidence">
          <CardShell className="space-y-6 p-6">
            <div>
              <div className="text-base font-semibold">Document (KTP)</div>
              <div className="mt-4 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                <div className="rounded-lg border border-dashed bg-muted/30 p-3">
                  <div className="aspect-[4/3] overflow-hidden rounded-md bg-muted/60">
                    <img
                      src={caseDetail.evidence.ktpImageUrl}
                      alt="KTP"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      Confidence{" "}
                      {(caseDetail.evidence.ktpOcr.confidence * 100).toFixed(0)}
                      %
                    </Badge>
                    {caseDetail.evidence.ktpOcr.flags?.map((flag) => (
                      <Badge key={flag} variant="outline">
                        {flag}
                      </Badge>
                    ))}
                  </div>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <PiiRevealGate
                      label="NIK"
                      maskedValue={maskNik(caseDetail.evidence.ktpOcr.nik)}
                      fullValue={caseDetail.evidence.ktpOcr.nik}
                      caseId={caseDetail.id}
                      fieldKey="OCR_NIK"
                      actor={actor}
                      allowReveal={role === "VERIFIER"}
                      policyDisabled={!flags.enablePIIReveal}
                    />
                    <PiiRevealGate
                      label="Name"
                      maskedValue={maskNik(caseDetail.evidence.ktpOcr.name)}
                      fullValue={caseDetail.evidence.ktpOcr.name}
                      caseId={caseDetail.id}
                      fieldKey="OCR_NAME"
                      actor={actor}
                      allowReveal={role === "VERIFIER"}
                      policyDisabled={!flags.enablePIIReveal}
                    />
                    {caseDetail.evidence.ktpOcr.birthDate ? (
                      <div>
                        Birth date: {caseDetail.evidence.ktpOcr.birthDate}
                      </div>
                    ) : null}
                    {caseDetail.evidence.ktpOcr.address ? (
                      <PiiRevealGate
                        label="Address"
                        maskedValue={maskNik(
                          caseDetail.evidence.ktpOcr.address,
                        )}
                        fullValue={caseDetail.evidence.ktpOcr.address}
                        caseId={caseDetail.id}
                        fieldKey="OCR_ADDRESS"
                        actor={actor}
                        allowReveal={role === "VERIFIER"}
                        policyDisabled={!flags.enablePIIReveal}
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
            <Separator />
            <div>
              <div className="text-base font-semibold">Selfie with KTP</div>
              <div className="mt-4 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                <div className="rounded-lg border border-dashed bg-muted/30 p-3">
                  <div className="aspect-[4/3] overflow-hidden rounded-md bg-muted/60">
                    <img
                      src={caseDetail.evidence.selfieWithKtpUrl}
                      alt="Selfie with KTP"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Fallback evidence when mismatch occurs.
                </div>
              </div>
            </div>
            <Separator />
            <div>
              <div className="text-base font-semibold">Liveness</div>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={livenessBadge.className}>
                    Result {livenessBadge.label}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-blue-200 text-blue-700"
                  >
                    Score{" "}
                    {caseDetail.evidence.liveness.score?.toFixed(2) ?? "-"}
                  </Badge>
                </div>
                <ScoreBar
                  value={caseDetail.evidence.liveness.score}
                  tone={
                    caseDetail.signals.liveness === "FAIL"
                      ? "red"
                      : caseDetail.signals.liveness === "PASS"
                        ? "emerald"
                        : "amber"
                  }
                />
                <div className="flex flex-wrap gap-2">
                  {caseDetail.evidence.liveness.gestures.map((gesture) => (
                    <Badge key={gesture} variant="outline">
                      {gesture}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardShell>
        </TabsContent>
        <TabsContent value="audit">
          {isAuditLoading ? (
            <CardShell className="space-y-3 p-6">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </CardShell>
          ) : auditError ? (
            <CardShell className="space-y-2 p-6">
              <div className="text-sm font-medium">
                Unable to load audit trail.
              </div>
              <Button onClick={() => refetchAudit()}>Retry</Button>
            </CardShell>
          ) : auditEvents.length === 0 ? (
            <CardShell className="p-6">
              <EmptyState
                title="No audit events"
                description="Actions taken on this case will appear here."
                action={<Button onClick={() => refetchAudit()}>Refresh</Button>}
              />
            </CardShell>
          ) : (
            <CardShell className="space-y-4 p-6">
              <div className="text-base font-semibold">Audit Trail</div>
              <div className="space-y-3">
                {auditEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-md border border-border/60 p-3 text-sm"
                  >
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
              </div>
            </CardShell>
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
          requireRejectTypingConfirm={flags.requireRejectTypingConfirm}
        />
      ) : null}
    </div>
  );
};
