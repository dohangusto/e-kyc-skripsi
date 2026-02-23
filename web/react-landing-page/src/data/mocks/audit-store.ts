import type { AuditEvent } from "@/domain/entities/audit-event";
import { mockAuditEvents } from "@/data/mocks/audit-events";

let auditStore: AuditEvent[] = [...mockAuditEvents];

export const listAuditStore = () => [...auditStore];

export const addAuditEvent = (event: AuditEvent) => {
  auditStore = [event, ...auditStore];
};
