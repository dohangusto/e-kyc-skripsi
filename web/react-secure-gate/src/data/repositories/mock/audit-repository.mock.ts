import type {
  AuditRepository,
  ListAuditParams,
  ListAuditResult,
} from "@/data/repositories/audit-repository";
import { sleep } from "@/shared/lib/sleep";
import { addAuditEvent, listAuditStore } from "@/data/mocks/audit-store";

const DEFAULT_DELAY_MS = 350;
const DEFAULT_PAGE_SIZE = 20;

const applyFilters = (params?: ListAuditParams) => {
  const all = listAuditStore();
  let results = [...all];

  if (params?.actorRole && params.actorRole !== "ALL") {
    results = results.filter((event) => event.actorRole === params.actorRole);
  }

  if (params?.action && params.action !== "ALL") {
    results = results.filter((event) => event.action === params.action);
  }

  if (params?.query) {
    const query = params.query.toLowerCase();
    results = results.filter(
      (event) =>
        event.caseId.toLowerCase().includes(query) ||
        event.actorName.toLowerCase().includes(query) ||
        event.reasonCode?.toLowerCase().includes(query) ||
        event.notes?.toLowerCase().includes(query),
    );
  }

  if (params?.dateFrom) {
    const fromTime = new Date(params.dateFrom).getTime();
    results = results.filter(
      (event) => new Date(event.createdAt).getTime() >= fromTime,
    );
  }

  if (params?.dateTo) {
    const toTime = new Date(params.dateTo).getTime();
    results = results.filter(
      (event) => new Date(event.createdAt).getTime() <= toTime,
    );
  }

  const sort = params?.sort ?? "NEWEST";
  results = results.sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return sort === "NEWEST" ? bTime - aTime : aTime - bTime;
  });

  return results;
};

const paginate = (
  items: ReturnType<typeof listAuditStore>,
  params?: ListAuditParams,
): ListAuditResult => {
  const pageSize = params?.pageSize ?? DEFAULT_PAGE_SIZE;
  const page = params?.page ?? 1;
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;
  const pagedItems = items.slice(start, start + pageSize);

  return {
    items: pagedItems,
    page: safePage,
    pageSize,
    totalItems,
    totalPages,
  };
};

export const mockAuditRepository: AuditRepository = {
  async listAuditEvents(params) {
    await sleep(DEFAULT_DELAY_MS);
    const filtered = applyFilters(params);
    return paginate(filtered, params);
  },
  async recordAuditEvent(event) {
    await sleep(150);
    addAuditEvent(event);
  },
};
