import {
  auditRepository,
  caseRepository,
  qcRepository,
} from "@/data/repositories";
import { getCaseDetailUsecase } from "@/domain/usecases/get-case-detail-usecase";
import { listAuditEventsUsecase } from "@/domain/usecases/list-audit-events-usecase";
import { listCasesUsecase } from "@/domain/usecases/list-cases-usecase";
import { decideCaseUsecase } from "@/domain/usecases/decide-case-usecase";
import { assignCaseUsecase } from "@/domain/usecases/assign-case-usecase";
import { unassignCaseUsecase } from "@/domain/usecases/unassign-case-usecase";
import { setTriageTagUsecase } from "@/domain/usecases/set-triage-tag-usecase";
import { bulkTriageUsecase } from "@/domain/usecases/bulk-triage-usecase";
import type { ListCasesParams } from "@/data/repositories/case-repository";
import type { DecisionPayload, QCVerdict, Role } from "@/domain/types";
import { listGlobalAuditEventsUsecase } from "@/domain/usecases/list-global-audit-events-usecase";
import { recordAuditEventUsecase } from "@/domain/usecases/record-audit-event-usecase";
import type { ListAuditParams } from "@/data/repositories/audit-repository";
import type { AuditEvent } from "@/domain/entities/audit-event";
import { getReasonAnalyticsUsecase } from "@/domain/usecases/get-reason-analytics-usecase";
import { listQCSamplesUsecase } from "@/domain/usecases/list-qc-samples-usecase";
import { createQCSampleUsecase } from "@/domain/usecases/create-qc-sample-usecase";
import { getQCSampleDetailUsecase } from "@/domain/usecases/get-qc-sample-detail-usecase";
import { recordQCReviewUsecase } from "@/domain/usecases/record-qc-review-usecase";
import type {
  CreateSampleParams,
  ListSamplesParams,
} from "@/data/repositories/qc-repository";
import type { AnalyticsParams } from "@/domain/usecases/get-reason-analytics-usecase";

export const caseUsecases = {
  listCases: (params?: ListCasesParams) =>
    listCasesUsecase(caseRepository, params),
  getCaseDetail: (id: string) => getCaseDetailUsecase(caseRepository, id),
  listAuditEvents: (caseId: string) =>
    listAuditEventsUsecase(caseRepository, caseId),
  decideCase: (
    caseId: string,
    payload: DecisionPayload,
    actor: { role: Role; name: string },
  ) => decideCaseUsecase(caseRepository, caseId, payload, actor),
  assignCase: (caseId: string, actor: { role: Role; name: string }) =>
    assignCaseUsecase(caseRepository, caseId, actor),
  unassignCase: (caseId: string, actor: { role: Role; name: string }) =>
    unassignCaseUsecase(caseRepository, caseId, actor),
  setTriageTag: (
    caseId: string,
    tag: "FOLLOW_UP" | "SUSPICIOUS" | null,
    actor: { role: Role; name: string },
  ) => setTriageTagUsecase(caseRepository, caseId, tag, actor),
  bulkTriage: (
    caseIds: string[],
    action:
      | { type: "ASSIGN_TO_ME" }
      | { type: "UNASSIGN" }
      | { type: "TAG"; tag: "FOLLOW_UP" | "SUSPICIOUS" | null },
    actor: { role: Role; name: string },
  ) => bulkTriageUsecase(caseRepository, caseIds, action, actor),
};

export const auditUsecases = {
  listAuditEvents: (params?: ListAuditParams) =>
    listGlobalAuditEventsUsecase(auditRepository, params),
  recordAuditEvent: (event: AuditEvent) =>
    recordAuditEventUsecase(auditRepository, event),
};

export const qcUsecases = {
  listSamples: (params?: ListSamplesParams) =>
    listQCSamplesUsecase(qcRepository, params),
  createSample: (
    params: CreateSampleParams,
    actor: { role: Role; name: string },
  ) => createQCSampleUsecase(qcRepository, params, actor),
  getSample: (sampleId: string) =>
    getQCSampleDetailUsecase(qcRepository, sampleId),
  recordReview: (
    sampleId: string,
    caseId: string,
    payload: { verdict: QCVerdict; notes?: string },
    actor: { role: Role; name: string },
  ) => recordQCReviewUsecase(qcRepository, sampleId, caseId, payload, actor),
};

export const analyticsUsecases = {
  getReasonAnalytics: (params?: AnalyticsParams) =>
    getReasonAnalyticsUsecase(auditRepository, caseRepository, params),
};
