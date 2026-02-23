import type { AuditEvent } from "@/domain/entities/audit-event";

export const mockAuditEvents: AuditEvent[] = [
  {
    id: "evt-9001",
    caseId: "case-1001",
    actorRole: "VERIFIER",
    actorName: "Verifier 1",
    action: "CASE_VIEWED",
    createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
  },
  {
    id: "evt-9002",
    caseId: "case-1002",
    actorRole: "SUPERVISOR",
    actorName: "Supervisor 1",
    action: "DECISION_REQUEST_REVERIFY",
    reasonCode: "LIVENESS_UNCERTAIN",
    notes: "Lighting was too dim for a confident match.",
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    id: "evt-9003",
    caseId: "case-1003",
    actorRole: "VERIFIER",
    actorName: "Verifier 2",
    action: "DECISION_APPROVED_MANUAL",
    reasonCode: "EVIDENCE_STRONG_MANUAL_REVIEW",
    notes: "OCR and liveness match applicant record.",
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
];
