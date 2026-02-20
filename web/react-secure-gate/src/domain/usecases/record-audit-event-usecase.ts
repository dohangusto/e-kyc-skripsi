import type { AuditRepository } from "@/data/repositories/audit-repository";
import type { AuditEvent } from "@/domain/entities/audit-event";

export const recordAuditEventUsecase = (repo: AuditRepository, event: AuditEvent) => {
  return repo.recordAuditEvent(event);
};
