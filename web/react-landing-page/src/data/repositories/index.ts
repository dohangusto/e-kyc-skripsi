import type { CaseRepository } from "@/data/repositories/case-repository";
import type { AuditRepository } from "@/data/repositories/audit-repository";
import type { QCRepository } from "@/data/repositories/qc-repository";
import { mockCaseRepository } from "@/data/repositories/mock/case-repository.mock";
import { mockAuditRepository } from "@/data/repositories/mock/audit-repository.mock";
import { mockQcRepository } from "@/data/repositories/mock/qc-repository.mock";

export const caseRepository: CaseRepository = mockCaseRepository;
export const auditRepository: AuditRepository = mockAuditRepository;
export const qcRepository: QCRepository = mockQcRepository;
