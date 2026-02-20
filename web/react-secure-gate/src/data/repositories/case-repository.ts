import type { AuditEvent } from "@/domain/entities/audit-event";
import type { VerificationCase } from "@/domain/entities/verification-case";
import type {
  CaseStatus,
  Eligibility,
  FaceMatch,
  RiskLevel,
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
  getCaseById(id: string): Promise<VerificationCase | null>;
  listAuditEvents(caseId: string): Promise<AuditEvent[]>;
}
