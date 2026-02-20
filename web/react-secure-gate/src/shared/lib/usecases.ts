import { caseRepository } from "@/data/repositories";
import { getCaseDetailUsecase } from "@/domain/usecases/get-case-detail-usecase";
import { listAuditEventsUsecase } from "@/domain/usecases/list-audit-events-usecase";
import { listCasesUsecase } from "@/domain/usecases/list-cases-usecase";
import type { ListCasesParams } from "@/data/repositories/case-repository";

export const caseUsecases = {
  listCases: (params?: ListCasesParams) => listCasesUsecase(caseRepository, params),
  getCaseDetail: (id: string) => getCaseDetailUsecase(caseRepository, id),
  listAuditEvents: (caseId: string) => listAuditEventsUsecase(caseRepository, caseId),
};
