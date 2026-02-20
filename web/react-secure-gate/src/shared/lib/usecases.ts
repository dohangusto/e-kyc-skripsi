import { auditRepository, caseRepository } from "@/data/repositories";
import { getCaseDetailUsecase } from "@/domain/usecases/get-case-detail-usecase";
import { listAuditEventsUsecase } from "@/domain/usecases/list-audit-events-usecase";
import { listCasesUsecase } from "@/domain/usecases/list-cases-usecase";
import { decideCaseUsecase } from "@/domain/usecases/decide-case-usecase";
import type { ListCasesParams } from "@/data/repositories/case-repository";
import type { DecisionPayload, Role } from "@/domain/types";
import { listGlobalAuditEventsUsecase } from "@/domain/usecases/list-global-audit-events-usecase";
import type { ListAuditParams } from "@/data/repositories/audit-repository";

export const caseUsecases = {
  listCases: (params?: ListCasesParams) =>
    listCasesUsecase(caseRepository, params),
  getCaseDetail: (id: string) => getCaseDetailUsecase(caseRepository, id),
  listAuditEvents: (caseId: string) =>
    listAuditEventsUsecase(caseRepository, caseId),
  decideCase: (
    caseId: string,
    payload: DecisionPayload,
    actor: { role: Role; name: string },
  ) => decideCaseUsecase(caseRepository, caseId, payload, actor),
};

export const auditUsecases = {
  listAuditEvents: (params?: ListAuditParams) =>
    listGlobalAuditEventsUsecase(auditRepository, params),
};
