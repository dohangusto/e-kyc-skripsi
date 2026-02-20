import { Badge } from "@/presentation/components/ui/badge";
import type { AuditEvent } from "@/domain/entities/audit-event";

type ActionBadgeProps = {
  action: AuditEvent["action"];
  abbreviated?: boolean;
};

export const actionLabelMap: Record<AuditEvent["action"], string> = {
  CASE_VIEWED: "Case viewed",
  DECISION_APPROVED_MANUAL: "Approved manually",
  DECISION_REJECTED: "Rejected",
  DECISION_REQUEST_REVERIFY: "Requested re-verification",
  PII_REVEALED: "PII revealed",
  QC_SAMPLE_CREATED: "QC sample created",
  QC_REVIEW_RECORDED: "QC review recorded",
  CASE_ASSIGNED: "Case assigned",
  CASE_UNASSIGNED: "Case unassigned",
  CASE_TRIAGE_TAG_UPDATED: "Triage tag updated",
  CASE_BULK_TRIAGE_APPLIED: "Bulk triage applied",
};

export const actionAbbreviationMap: Record<AuditEvent["action"], string> = {
  CASE_VIEWED: "CV",
  DECISION_APPROVED_MANUAL: "AM",
  DECISION_REJECTED: "RJ",
  DECISION_REQUEST_REVERIFY: "RR",
  PII_REVEALED: "PR",
  QC_SAMPLE_CREATED: "QSC",
  QC_REVIEW_RECORDED: "QCR",
  CASE_ASSIGNED: "CA",
  CASE_UNASSIGNED: "CU",
  CASE_TRIAGE_TAG_UPDATED: "TTU",
  CASE_BULK_TRIAGE_APPLIED: "BTA",
};

const actionConfig: Record<AuditEvent["action"], { className: string }> = {
  CASE_VIEWED: {
    className: "border-slate-200 bg-slate-50 text-slate-700",
  },
  DECISION_APPROVED_MANUAL: {
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  DECISION_REJECTED: {
    className: "border-red-200 bg-red-50 text-red-700",
  },
  DECISION_REQUEST_REVERIFY: {
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  PII_REVEALED: {
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  QC_SAMPLE_CREATED: {
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  QC_REVIEW_RECORDED: {
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  CASE_ASSIGNED: {
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  CASE_UNASSIGNED: {
    className: "border-slate-200 bg-slate-50 text-slate-700",
  },
  CASE_TRIAGE_TAG_UPDATED: {
    className: "border-indigo-200 bg-indigo-50 text-indigo-700",
  },
  CASE_BULK_TRIAGE_APPLIED: {
    className: "border-indigo-200 bg-indigo-50 text-indigo-700",
  },
};

export const ActionBadge = ({
  action,
  abbreviated = false,
}: ActionBadgeProps) => {
  const config = actionConfig[action];
  const fullLabel = actionLabelMap[action];
  const shortLabel = actionAbbreviationMap[action];
  return (
    <Badge variant="outline" className={config.className} title={fullLabel}>
      {abbreviated ? shortLabel : fullLabel}
    </Badge>
  );
};
