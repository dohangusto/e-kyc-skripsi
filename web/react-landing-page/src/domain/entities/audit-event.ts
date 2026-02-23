import type { Role } from "@/domain/types";

export type AuditAction =
  | "CASE_VIEWED"
  | "DECISION_APPROVED_MANUAL"
  | "DECISION_REJECTED"
  | "DECISION_REQUEST_REVERIFY"
  | "PII_REVEALED"
  | "QC_SAMPLE_CREATED"
  | "QC_REVIEW_RECORDED"
  | "CASE_ASSIGNED"
  | "CASE_UNASSIGNED"
  | "CASE_TRIAGE_TAG_UPDATED"
  | "CASE_BULK_TRIAGE_APPLIED";

export type AuditEvent = {
  id: string;
  caseId: string;
  actorRole: Role;
  actorName: string;
  action: AuditAction;
  reasonCode?: string;
  notes?: string;
  createdAt: string;
};
