import type { AuditRepository, ListAuditParams } from "@/data/repositories/audit-repository";

export const listGlobalAuditEventsUsecase = (
  repo: AuditRepository,
  params?: ListAuditParams
) => {
  return repo.listAuditEvents(params);
};
