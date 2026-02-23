import type { CaseRepository } from "@/data/repositories/case-repository";

export const listAuditEventsUsecase = (repo: CaseRepository, caseId: string) => {
  return repo.listAuditEvents(caseId);
};
