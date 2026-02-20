import type { CaseRepository } from "@/data/repositories/case-repository";
import type { AuditRepository } from "@/data/repositories/audit-repository";
import { mockCaseRepository } from "@/data/repositories/mock/case-repository.mock";
import { mockAuditRepository } from "@/data/repositories/mock/audit-repository.mock";

export const caseRepository: CaseRepository = mockCaseRepository;
export const auditRepository: AuditRepository = mockAuditRepository;
