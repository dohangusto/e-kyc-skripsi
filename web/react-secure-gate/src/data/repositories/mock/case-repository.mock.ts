import type { CaseRepository, ListCasesParams, ListCasesResult } from "@/data/repositories/case-repository";
import { mockCases } from "@/data/mocks/cases";
import { mockAuditEvents } from "@/data/mocks/audit-events";
import { sleep } from "@/shared/lib/sleep";

const DEFAULT_DELAY_MS = 350;
const DEFAULT_PAGE_SIZE = 20;

const applyFilters = (params?: ListCasesParams) => {
  if (!params) return [...mockCases];
  let results = [...mockCases];

  if (params.status && params.status !== "ALL") {
    results = results.filter((item) => item.status === params.status);
  }

  if (params.eligibility && params.eligibility !== "ALL") {
    results = results.filter((item) => item.eligibility === params.eligibility);
  }

  if (params.faceMatch && params.faceMatch !== "ALL") {
    results = results.filter((item) => item.signals.faceMatch === params.faceMatch);
  }

  if (params.riskLevel && params.riskLevel !== "ALL") {
    results = results.filter((item) => item.riskLevel === params.riskLevel);
  }

  if (params.query) {
    const query = params.query.toLowerCase();
    results = results.filter(
      (item) =>
        item.id.toLowerCase().includes(query) ||
        item.applicant.name.toLowerCase().includes(query) ||
        item.applicant.nik.toLowerCase().includes(query)
    );
  }

  const sort = params.sort ?? "NEWEST";
  results = results.sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return sort === "NEWEST" ? bTime - aTime : aTime - bTime;
  });

  return results;
};

const paginate = (items: typeof mockCases, params?: ListCasesParams): ListCasesResult => {
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

export const mockCaseRepository: CaseRepository = {
  async listCases(params) {
    await sleep(DEFAULT_DELAY_MS);
    const filtered = applyFilters(params);
    return paginate(filtered, params);
  },
  async getCaseById(id) {
    await sleep(DEFAULT_DELAY_MS);
    return mockCases.find((item) => item.id === id) ?? null;
  },
  async listAuditEvents(caseId) {
    await sleep(DEFAULT_DELAY_MS);
    return mockAuditEvents.filter((event) => event.caseId === caseId);
  },
};
