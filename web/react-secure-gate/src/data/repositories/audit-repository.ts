import type { AuditEvent } from "@/domain/entities/audit-event";
import type { Role } from "@/domain/types";

export type ListAuditParams = {
  page?: number;
  pageSize?: number;
  query?: string;
  actorRole?: "ALL" | Role;
  action?: "ALL" | AuditEvent["action"];
  dateFrom?: string;
  dateTo?: string;
  sort?: "NEWEST" | "OLDEST";
};

export type ListAuditResult = {
  items: AuditEvent[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export interface AuditRepository {
  listAuditEvents(params?: ListAuditParams): Promise<ListAuditResult>;
}
