import type { Role } from "@/domain/types";

export type AuditAction =
  | "CASE_VIEWED"
  | "DECISION_APPROVED_MANUAL"
  | "DECISION_REJECTED"
  | "DECISION_REQUEST_REVERIFY";

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
