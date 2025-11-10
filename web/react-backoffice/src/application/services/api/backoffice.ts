import { backofficeHttpClient } from '@infrastructure/adapters/http/client'
import type {
  ApplicationSummaryResponse,
  AssignClusteringCandidatePayload,
  AuditLogResponse,
  BackofficeApplicationResponse,
  BatchResponse,
  ClusteringRunResponse,
  ConfirmDuplicatePayload,
  CreateBatchPayload,
  CreateDistributionPayload,
  CreateVisitPayload,
  EscalateApplicationPayload,
  IgnoreDuplicatePayload,
  ListEnvelope,
  NotifyDistributionPayload,
  OverviewResponse,
  SystemConfigResponse,
  TriggerClusteringRunPayload,
  UpdateApplicationStatusPayload,
  UpdateBatchStatusPayload,
  UpdateClusteringCandidateStatusPayload,
  UpdateDistributionStatusPayload,
  UpdateSystemConfigPayload,
  UpdateVisitPayload,
  UserResponse,
  VisitResponse,
  DistributionResponse,
} from './backoffice.types'

const routes = {
  applicationSummaries: '/api/applications',
  backofficeApplications: '/api/backoffice/applications',
  applicationDetail: (id: string) => `/api/applications/${id}`,
  applicationStatus: (id: string) => `/api/applications/${id}/status`,
  applicationEscalate: (id: string) => `/api/applications/${id}/escalate`,
  applicationConfirmDuplicate: (id: string) => `/api/applications/${id}/duplicate/confirm`,
  applicationIgnoreDuplicate: (id: string) => `/api/applications/${id}/duplicate/ignore`,
  applicationCreateVisit: (id: string) => `/api/applications/${id}/visits`,
  applicationVisitDetail: (id: string, visitId: string) => `/api/applications/${id}/visits/${visitId}`,
  users: '/api/users',
  config: '/api/config',
  batches: '/api/batches',
  batchStatus: (id: string) => `/api/batches/${id}/status`,
  distributions: '/api/distributions',
  distributionStatus: (id: string) => `/api/distributions/${id}/status`,
  distributionNotify: (id: string) => `/api/distributions/${id}/notify`,
  clusteringRuns: '/api/clustering/runs',
  clusteringRun: (id: string) => `/api/clustering/runs/${id}`,
  clusteringAssign: (runID: string, candidateID: string) =>
    `/api/clustering/runs/${runID}/candidates/${candidateID}/assign`,
  clusteringStatus: (runID: string, candidateID: string) =>
    `/api/clustering/runs/${runID}/candidates/${candidateID}/status`,
  audit: '/api/audit',
  overview: '/api/overview',
} as const

export const BackofficeAPI = {
  listApplicationSummaries(limit?: number) {
    return backofficeHttpClient.get<ListEnvelope<ApplicationSummaryResponse[]>>(routes.applicationSummaries, {
      query: { limit },
    })
  },

  listApplications(limit?: number) {
    return backofficeHttpClient.get<ListEnvelope<BackofficeApplicationResponse[]>>(routes.backofficeApplications, {
      query: { limit },
    })
  },

  getApplication(id: string) {
    return backofficeHttpClient.get<BackofficeApplicationResponse>(routes.applicationDetail(id))
  },

  updateApplicationStatus(id: string, payload: UpdateApplicationStatusPayload) {
    return backofficeHttpClient.post<void, UpdateApplicationStatusPayload>(routes.applicationStatus(id), {
      body: payload,
    })
  },

  escalateApplication(id: string, payload: EscalateApplicationPayload) {
    return backofficeHttpClient.post<void, EscalateApplicationPayload>(routes.applicationEscalate(id), {
      body: payload,
    })
  },

  confirmDuplicate(id: string, payload: ConfirmDuplicatePayload) {
    return backofficeHttpClient.post<void, ConfirmDuplicatePayload>(routes.applicationConfirmDuplicate(id), {
      body: payload,
    })
  },

  ignoreDuplicate(id: string, payload: IgnoreDuplicatePayload) {
    return backofficeHttpClient.post<void, IgnoreDuplicatePayload>(routes.applicationIgnoreDuplicate(id), {
      body: payload,
    })
  },

  createVisit(id: string, payload: CreateVisitPayload) {
    return backofficeHttpClient.post<VisitResponse, CreateVisitPayload>(routes.applicationCreateVisit(id), {
      body: payload,
    })
  },

  updateVisit(id: string, visitId: string, payload: UpdateVisitPayload) {
    return backofficeHttpClient.patch<void, UpdateVisitPayload>(routes.applicationVisitDetail(id, visitId), {
      body: payload,
    })
  },

  listUsers() {
    return backofficeHttpClient.get<ListEnvelope<UserResponse[]>>(routes.users)
  },

  getConfig() {
    return backofficeHttpClient.get<SystemConfigResponse>(routes.config)
  },

  updateConfig(payload: UpdateSystemConfigPayload) {
    return backofficeHttpClient.put<SystemConfigResponse, UpdateSystemConfigPayload>(routes.config, { body: payload })
  },

  listBatches() {
    return backofficeHttpClient.get<ListEnvelope<BatchResponse[]>>(routes.batches)
  },

  createBatch(payload: CreateBatchPayload) {
    return backofficeHttpClient.post<BatchResponse, CreateBatchPayload>(routes.batches, { body: payload })
  },

  updateBatchStatus(id: string, payload: UpdateBatchStatusPayload) {
    return backofficeHttpClient.post<void, UpdateBatchStatusPayload>(routes.batchStatus(id), { body: payload })
  },

  listDistributions() {
    return backofficeHttpClient.get<ListEnvelope<DistributionResponse[]>>(routes.distributions)
  },

  createDistribution(payload: CreateDistributionPayload) {
    return backofficeHttpClient.post<DistributionResponse>(routes.distributions, {
      body: {
        actor: payload.actor,
        name: payload.name,
        scheduled_at: payload.scheduledAt,
        channel: payload.channel,
        location: payload.location,
        notes: payload.notes,
        batch_codes: payload.batchCodes,
        beneficiaries: payload.beneficiaries,
      },
    })
  },

  updateDistributionStatus(id: string, payload: UpdateDistributionStatusPayload) {
    return backofficeHttpClient.post<void, UpdateDistributionStatusPayload>(routes.distributionStatus(id), {
      body: payload,
    })
  },

  notifyDistribution(id: string, payload: NotifyDistributionPayload) {
    return backofficeHttpClient.post<void, NotifyDistributionPayload>(routes.distributionNotify(id), {
      body: payload,
    })
  },

  listClusteringRuns() {
    return backofficeHttpClient.get<ListEnvelope<ClusteringRunResponse[]>>(routes.clusteringRuns)
  },

  triggerClusteringRun(payload: TriggerClusteringRunPayload) {
    return backofficeHttpClient.post<ClusteringRunResponse, TriggerClusteringRunPayload>(routes.clusteringRuns, {
      body: payload,
    })
  },

  getClusteringRun(id: string) {
    return backofficeHttpClient.get<ClusteringRunResponse>(routes.clusteringRun(id))
  },

  assignClusteringCandidate(runId: string, candidateId: string, payload: AssignClusteringCandidatePayload) {
    return backofficeHttpClient.post<void, AssignClusteringCandidatePayload>(
      routes.clusteringAssign(runId, candidateId),
      { body: payload },
    )
  },

  updateClusteringCandidateStatus(
    runId: string,
    candidateId: string,
    payload: UpdateClusteringCandidateStatusPayload,
  ) {
    return backofficeHttpClient.post<void, UpdateClusteringCandidateStatusPayload>(
      routes.clusteringStatus(runId, candidateId),
      { body: payload },
    )
  },

  listAuditLogs(limit?: number) {
    return backofficeHttpClient.get<ListEnvelope<AuditLogResponse[]>>(routes.audit, { query: { limit } })
  },

  overview() {
    return backofficeHttpClient.get<OverviewResponse>(routes.overview)
  },
}
