import type { AuditEvent } from "@/domain/entities/audit-event";
import type { VerificationCase } from "@/domain/entities/verification-case";
import type { CaseStatus } from "@/domain/types";

export type ListCasesParams = {
  status?: CaseStatus;
  search?: string;
  limit?: number;
};

export interface CaseRepository {
  listCases(params?: ListCasesParams): Promise<VerificationCase[]>;
  getCaseById(id: string): Promise<VerificationCase | null>;
  listAuditEvents(caseId: string): Promise<AuditEvent[]>;
}
