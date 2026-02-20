import type { AuditEvent } from "@/domain/entities/audit-event";
import type { VerificationCase } from "@/domain/entities/verification-case";
import type {
  CaseStatus,
  DecisionPayload,
  Eligibility,
  FaceMatch,
  RiskLevel,
  Role,
} from "@/domain/types";

export type ListCasesParams = {
  page?: number;
  pageSize?: number;
  query?: string;
  status?: CaseStatus | "ALL";
  eligibility?: "ALL" | Eligibility;
  faceMatch?: "ALL" | FaceMatch;
  riskLevel?: "ALL" | RiskLevel;
  sort?: "NEWEST" | "OLDEST";
};

export type ListCasesResult = {
  items: VerificationCase[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export interface CaseRepository {
  listCases(params?: ListCasesParams): Promise<ListCasesResult>;
  getCaseById(id: string): Promise<VerificationCase>;
  listAuditEvents(caseId: string): Promise<AuditEvent[]>;
  decideCase(
    caseId: string,
    payload: DecisionPayload,
    actor: { role: Role; name: string },
  ): Promise<VerificationCase>;
  assignCase(
    caseId: string,
    actor: { role: Role; name: string },
  ): Promise<VerificationCase>;
  unassignCase(
    caseId: string,
    actor: { role: Role; name: string },
  ): Promise<VerificationCase>;
  setTriageTag(
    caseId: string,
    tag: "FOLLOW_UP" | "SUSPICIOUS" | null,
    actor: { role: Role; name: string },
  ): Promise<VerificationCase>;
  bulkTriage(
    caseIds: string[],
    action:
      | { type: "ASSIGN_TO_ME" }
      | { type: "UNASSIGN" }
      | { type: "TAG"; tag: "FOLLOW_UP" | "SUSPICIOUS" | null },
    actor: { role: Role; name: string },
  ): Promise<{ updated: number }>;
}
