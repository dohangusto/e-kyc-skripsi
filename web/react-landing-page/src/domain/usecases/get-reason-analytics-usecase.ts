import type { AuditRepository } from "@/data/repositories/audit-repository";
import type { CaseRepository } from "@/data/repositories/case-repository";
import type { AuditEvent } from "@/domain/entities/audit-event";

export type AnalyticsParams = {
  dateFrom?: string;
  dateTo?: string;
};

export type ReasonCount = {
  reasonCode: string;
  count: number;
};

export type AnalyticsResult = {
  decisionCounts: {
    approvedManual: number;
    rejected: number;
    reverify: number;
    total: number;
  };
  topRejectReasons: ReasonCount[];
  topReverifyReasons: ReasonCount[];
  fallbackRate: number;
};

const countReasons = (events: AuditEvent[]): ReasonCount[] => {
  const counts = new Map<string, number>();
  events.forEach((event) => {
    if (!event.reasonCode) return;
    counts.set(event.reasonCode, (counts.get(event.reasonCode) ?? 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([reasonCode, count]) => ({ reasonCode, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
};

export const getReasonAnalyticsUsecase = async (
  auditRepository: AuditRepository,
  caseRepository: CaseRepository,
  params?: AnalyticsParams,
): Promise<AnalyticsResult> => {
  const auditResult = await auditRepository.listAuditEvents({
    page: 1,
    pageSize: 1000,
    dateFrom: params?.dateFrom,
    dateTo: params?.dateTo,
    sort: "NEWEST",
  });

  const decisionEvents = auditResult.items.filter((event) =>
    [
      "DECISION_APPROVED_MANUAL",
      "DECISION_REJECTED",
      "DECISION_REQUEST_REVERIFY",
    ].includes(event.action),
  );

  const approvedManual = decisionEvents.filter(
    (event) => event.action === "DECISION_APPROVED_MANUAL",
  );
  const rejected = decisionEvents.filter(
    (event) => event.action === "DECISION_REJECTED",
  );
  const reverify = decisionEvents.filter(
    (event) => event.action === "DECISION_REQUEST_REVERIFY",
  );

  const caseResult = await caseRepository.listCases({
    page: 1,
    pageSize: 1000,
  });

  const submittedStatuses = new Set([
    "EKYC_SUBMITTED",
    "FALLBACK_REVIEW",
    "AUTO_VERIFIED",
    "APPROVED_MANUAL",
    "REJECTED",
    "NEED_REVERIFY",
  ]);

  const submittedCases = caseResult.items.filter((item) =>
    submittedStatuses.has(item.status),
  );
  const fallbackCases = caseResult.items.filter(
    (item) => item.status === "FALLBACK_REVIEW",
  );
  const fallbackRate =
    submittedCases.length > 0
      ? fallbackCases.length / submittedCases.length
      : 0;

  return {
    decisionCounts: {
      approvedManual: approvedManual.length,
      rejected: rejected.length,
      reverify: reverify.length,
      total: decisionEvents.length,
    },
    topRejectReasons: countReasons(rejected),
    topReverifyReasons: countReasons(reverify),
    fallbackRate,
  };
};
