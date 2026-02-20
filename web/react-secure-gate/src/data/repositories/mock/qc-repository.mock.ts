import type {
  QCRepository,
  ListSamplesParams,
  ListSamplesResult,
} from "@/data/repositories/qc-repository";
import { listCaseStore } from "@/data/mocks/case-store";
import { addAuditEvent } from "@/data/mocks/audit-store";
import {
  addQcSample,
  getQcSample,
  listQcSamples,
  updateQcSample,
} from "@/data/mocks/qc-store";
import { sleep } from "@/shared/lib/sleep";
import { NotFoundError } from "@/shared/lib/errors";
import type { AuditEvent } from "@/domain/entities/audit-event";

const DEFAULT_DELAY_MS = 350;
const DEFAULT_PAGE_SIZE = 10;

const pickRandom = (items: string[], count: number) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
};

const paginate = (
  items: ReturnType<typeof listQcSamples>,
  params?: ListSamplesParams,
): ListSamplesResult => {
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

export const mockQcRepository: QCRepository = {
  async createSample(params, actor) {
    await sleep(DEFAULT_DELAY_MS);
    const fromTime = new Date(params.fromDateISO).getTime();
    const toTime = new Date(params.toDateISO).getTime();

    const eligible = listCaseStore().filter((item) => {
      if (!params.statuses.includes(item.status)) return false;
      const decidedAt = item.decidedAt ?? item.updatedAt ?? item.createdAt;
      const decidedTime = new Date(decidedAt).getTime();
      return decidedTime >= fromTime && decidedTime <= toTime;
    });

    const caseIds = pickRandom(
      eligible.map((item) => item.id),
      Math.min(params.sampleSize, eligible.length),
    );

    const sample = {
      id: `qc-${Date.now()}`,
      createdAt: new Date().toISOString(),
      createdBy: { role: actor.role, name: actor.name },
      criteria: {
        fromDateISO: params.fromDateISO,
        toDateISO: params.toDateISO,
        statuses: params.statuses,
        sampleSize: params.sampleSize,
      },
      caseIds,
      results: [],
    };

    addQcSample(sample);

    const auditEvent: AuditEvent = {
      id: `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      caseId: sample.id,
      actorRole: actor.role,
      actorName: actor.name,
      action: "QC_SAMPLE_CREATED",
      notes: `sampleSize=${params.sampleSize}; range=${params.fromDateISO}..${params.toDateISO}`,
      createdAt: new Date().toISOString(),
    };

    addAuditEvent(auditEvent);

    return sample;
  },
  async getSampleById(sampleId) {
    await sleep(DEFAULT_DELAY_MS);
    const found = getQcSample(sampleId);
    if (!found) {
      throw new NotFoundError(`QC sample ${sampleId} not found`);
    }
    return found;
  },
  async listSamples(params) {
    await sleep(DEFAULT_DELAY_MS);
    const items = listQcSamples();
    return paginate(items, params);
  },
  async recordReview(sampleId, caseId, payload, actor) {
    await sleep(DEFAULT_DELAY_MS);
    const sample = getQcSample(sampleId);
    if (!sample) {
      throw new NotFoundError(`QC sample ${sampleId} not found`);
    }

    const existingIndex = sample.results.findIndex(
      (result) => result.caseId === caseId,
    );
    const nextResult = {
      caseId,
      verdict: payload.verdict,
      notes: payload.notes,
      reviewedAt: new Date().toISOString(),
      reviewer: { role: actor.role, name: actor.name },
    };

    const nextResults = [...sample.results];
    if (existingIndex >= 0) {
      nextResults[existingIndex] = nextResult;
    } else {
      nextResults.push(nextResult);
    }

    const updated = {
      ...sample,
      results: nextResults,
    };

    updateQcSample(updated);

    const auditEvent: AuditEvent = {
      id: `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      caseId,
      actorRole: actor.role,
      actorName: actor.name,
      action: "QC_REVIEW_RECORDED",
      notes: payload.notes
        ? `verdict=${payload.verdict}; sampleId=${sampleId}; ${payload.notes}`
        : `verdict=${payload.verdict}; sampleId=${sampleId}`,
      createdAt: new Date().toISOString(),
    };

    addAuditEvent(auditEvent);

    return updated;
  },
};
