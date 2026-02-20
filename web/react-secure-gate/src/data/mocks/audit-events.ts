import type { AuditEvent } from "@/domain/entities/audit-event";

export const mockAuditEvents: AuditEvent[] = [
  {
    id: "evt-9001",
    caseId: "case-1001",
    actor: "System",
    message: "Case created from applicant submission.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "evt-9002",
    caseId: "case-1002",
    actor: "Verifier",
    message: "Escalated to fallback review.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "evt-9003",
    caseId: "case-1003",
    actor: "Supervisor",
    message: "Manual approval granted.",
    createdAt: new Date().toISOString(),
  },
];
