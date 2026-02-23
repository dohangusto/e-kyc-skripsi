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

export const actionClassMap: Record<AuditEvent["action"], string> = {
  CASE_VIEWED: "border-slate-200 bg-slate-50 text-slate-700",
  DECISION_APPROVED_MANUAL: "border-emerald-200 bg-emerald-50 text-emerald-700",
  DECISION_REJECTED: "border-red-200 bg-red-50 text-red-700",
  DECISION_REQUEST_REVERIFY: "border-blue-200 bg-blue-50 text-blue-700",
  PII_REVEALED: "border-amber-200 bg-amber-50 text-amber-700",
  QC_SAMPLE_CREATED: "border-blue-200 bg-blue-50 text-blue-700",
  QC_REVIEW_RECORDED: "border-amber-200 bg-amber-50 text-amber-700",
  CASE_ASSIGNED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CASE_UNASSIGNED: "border-slate-200 bg-slate-50 text-slate-700",
  CASE_TRIAGE_TAG_UPDATED: "border-indigo-200 bg-indigo-50 text-indigo-700",
  CASE_BULK_TRIAGE_APPLIED: "border-indigo-200 bg-indigo-50 text-indigo-700",
};

export const ActionBadge = ({
  action,
  abbreviated = false,
}: ActionBadgeProps) => {
  const config = actionClassMap[action];
  const fullLabel = actionLabelMap[action];
  const shortLabel = actionAbbreviationMap[action];
  return (
    <Badge variant="outline" className={config} title={fullLabel}>
      {abbreviated ? shortLabel : fullLabel}
    </Badge>
  );
};
