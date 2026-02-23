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
  CASE_VIEWED: "border-[#BFC9D1]/80 bg-[#EAEFEF]/80 text-[#25343F]",
  DECISION_APPROVED_MANUAL: "border-[#25343F]/70 bg-[#EAEFEF]/70 text-[#FF9B51]",
  DECISION_REJECTED: "border-[#25343F] bg-[#25343F] text-[#FF9B51]",
  DECISION_REQUEST_REVERIFY: "border-[#FF9B51]/80 bg-[#FF9B51]/30 text-[#25343F]",
  PII_REVEALED:
    "border-[#FF9B51]/60 bg-[linear-gradient(135deg,rgba(255,155,81,0.25),rgba(234,239,239,0.8))] text-[#25343F]",
  QC_SAMPLE_CREATED: "border-[#BFC9D1]/70 bg-[#BFC9D1]/30 text-[#25343F]",
  QC_REVIEW_RECORDED: "border-[#25343F]/50 bg-[#EAEFEF]/80 text-[#FF9B51]",
  CASE_ASSIGNED: "border-[#FF9B51]/60 bg-[#BFC9D1]/40 text-[#25343F]",
  CASE_UNASSIGNED: "border-[#25343F]/30 bg-[#25343F]/10 text-[#25343F]",
  CASE_TRIAGE_TAG_UPDATED: "border-[#FF9B51]/70 bg-[#FF9B51]/15 text-[#25343F]",
  CASE_BULK_TRIAGE_APPLIED:
    "border-[#25343F]/60 bg-[linear-gradient(135deg,rgba(191,201,209,0.45),rgba(255,155,81,0.25))] text-[#25343F]",
};

export const ActionBadge = ({ action, abbreviated = false }: ActionBadgeProps) => {
  const config = actionClassMap[action];
  const fullLabel = actionLabelMap[action];
  const shortLabel = actionAbbreviationMap[action];
  return (
    <Badge variant="outline" className={config} title={fullLabel}>
      {abbreviated ? shortLabel : fullLabel}
    </Badge>
  );
};
