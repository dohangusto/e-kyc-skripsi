import type {
  CaseRepository,
  ListCasesParams,
  ListCasesResult,
} from "@/data/repositories/case-repository";
import { mockCases } from "@/data/mocks/cases";
import { addAuditEvent, listAuditStore } from "@/data/mocks/audit-store";
import { sleep } from "@/shared/lib/sleep";
import { NotFoundError } from "@/shared/lib/errors";
import type { DecisionPayload } from "@/domain/types";
import type { AuditEvent, AuditAction } from "@/domain/entities/audit-event";

const DEFAULT_DELAY_MS = 350;
const DEFAULT_PAGE_SIZE = 20;

let casesStore = [...mockCases];

const applyFilters = (params?: ListCasesParams) => {
  if (!params) return [...casesStore];
  let results = [...casesStore];

  if (params.status && params.status !== "ALL") {
    results = results.filter((item) => item.status === params.status);
  }

  if (params.eligibility && params.eligibility !== "ALL") {
    results = results.filter((item) => item.eligibility === params.eligibility);
  }

  if (params.faceMatch && params.faceMatch !== "ALL") {
    results = results.filter(
      (item) => item.signals.faceMatch === params.faceMatch,
    );
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
        item.applicant.nik.toLowerCase().includes(query),
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

const paginate = (
  items: typeof casesStore,
  params?: ListCasesParams,
): ListCasesResult => {
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

const mapDecisionToStatus = (payload: DecisionPayload) => {
  switch (payload.type) {
    case "APPROVE_MANUAL":
      return "APPROVED_MANUAL" as const;
    case "REJECT":
      return "REJECTED" as const;
    case "REQUEST_REVERIFY":
      return "NEED_REVERIFY" as const;
    default:
      return "NEED_REVERIFY" as const;
  }
};

const mapDecisionToAction = (payload: DecisionPayload): AuditAction => {
  switch (payload.type) {
    case "APPROVE_MANUAL":
      return "DECISION_APPROVED_MANUAL";
    case "REJECT":
      return "DECISION_REJECTED";
    case "REQUEST_REVERIFY":
      return "DECISION_REQUEST_REVERIFY";
    default:
      return "DECISION_REQUEST_REVERIFY";
  }
};

const mapDecisionToRestriction = (payload: DecisionPayload) => {
  switch (payload.type) {
    case "APPROVE_MANUAL":
      return "FULL" as const;
    case "REJECT":
      return "LIMITED" as const;
    case "REQUEST_REVERIFY":
      return "LIMITED" as const;
    default:
      return "LIMITED" as const;
  }
};

export const mockCaseRepository: CaseRepository = {
  async listCases(params) {
    await sleep(DEFAULT_DELAY_MS);
    const filtered = applyFilters(params);
    return paginate(filtered, params);
  },
  async getCaseById(id) {
    await sleep(DEFAULT_DELAY_MS);
    const found = casesStore.find((item) => item.id === id);
    if (!found) {
      throw new NotFoundError(`Case ${id} not found`);
    }
    return found;
  },
  async listAuditEvents(caseId) {
    await sleep(DEFAULT_DELAY_MS);
    return listAuditStore()
      .filter((event) => event.caseId === caseId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  },
  async decideCase(caseId, payload, actor) {
    await sleep(DEFAULT_DELAY_MS);
    const caseIndex = casesStore.findIndex((item) => item.id === caseId);
    if (caseIndex === -1) {
      throw new NotFoundError(`Case ${caseId} not found`);
    }

    const current = casesStore[caseIndex];
    const updated = {
      ...current,
      status: mapDecisionToStatus(payload),
      updatedAt: new Date().toISOString(),
      signals: {
        ...current.signals,
        restriction: mapDecisionToRestriction(payload),
      },
    };

    casesStore = [
      ...casesStore.slice(0, caseIndex),
      updated,
      ...casesStore.slice(caseIndex + 1),
    ];

    const auditEvent: AuditEvent = {
      id: `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      caseId,
      actorRole: actor.role,
      actorName: actor.name,
      action: mapDecisionToAction(payload),
      reasonCode: payload.reasonCode,
      notes: payload.notes,
      createdAt: new Date().toISOString(),
    };

    addAuditEvent(auditEvent);

    return updated;
  },
};
