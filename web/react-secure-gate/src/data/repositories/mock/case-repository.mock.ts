import type { CaseRepository, ListCasesParams } from "@/data/repositories/case-repository";
import { mockCases } from "@/data/mocks/cases";
import { mockAuditEvents } from "@/data/mocks/audit-events";
import { sleep } from "@/shared/lib/sleep";

const DEFAULT_DELAY_MS = 350;

const filterCases = (params?: ListCasesParams) => {
  if (!params) return [...mockCases];
  let results = [...mockCases];

  if (params.status) {
    results = results.filter((item) => item.status === params.status);
  }

  if (params.search) {
    const query = params.search.toLowerCase();
    results = results.filter(
      (item) =>
        item.id.toLowerCase().includes(query) ||
        item.applicant.fullName.toLowerCase().includes(query) ||
        item.applicant.nationalId.toLowerCase().includes(query)
    );
  }

  if (params.limit) {
    results = results.slice(0, params.limit);
  }

  return results;
};

export const mockCaseRepository: CaseRepository = {
  async listCases(params) {
    await sleep(DEFAULT_DELAY_MS);
    return filterCases(params);
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
