import type {
  Application,
  Batch,
  ClusteringCandidate,
  ClusteringRun,
  Config,
  Distribution,
  Region,
  User,
  Visit,
} from '@domain/types'

import type {
  AuditLogResponse,
  BackofficeApplicationResponse,
  BatchResponse,
  ClusteringCandidateResponse,
  ClusteringRunResponse,
  DistributionResponse,
  SystemConfigResponse,
  UpdateSystemConfigPayload,
  UserResponse,
  VisitResponse,
} from './backoffice.types'

const toRegion = (region?: { Prov: string; Kab: string; Kec: string; Kel: string }): Region => ({
  prov: region?.Prov ?? '',
  kab: region?.Kab ?? '',
  kec: region?.Kec ?? '',
  kel: region?.Kel ?? '',
})

const normalizeFlags = (flags?: Record<string, unknown>) => {
  const normalized = { ...(flags ?? {}) } as Record<string, unknown>
  if (normalized.duplicate_nik === undefined) normalized.duplicate_nik = false
  if (normalized.duplicate_face === undefined) normalized.duplicate_face = false
  if (normalized.device_anomaly === undefined) normalized.device_anomaly = false
  if (normalized.similarity === undefined) normalized.similarity = 0
  return normalized
}

export const mapApplicationResponse = (input: BackofficeApplicationResponse): Application => ({
  id: input.ID,
  applicant: {
    name: input.ApplicantName,
    nik_mask: input.ApplicantNikMask,
    dob: input.ApplicantDOB,
    phone_mask: input.ApplicantPhone,
  },
  region: toRegion(input.Region),
  status: input.Status as Application['status'],
  scores: {
    ocr: input.ScoreOCR,
    face: input.ScoreFace,
    liveness: input.ScoreLiveness,
  },
  flags: normalizeFlags(input.Flags) as Application['flags'],
  assigned_to: input.AssignedTo ?? '',
  aging_days: input.AgingDays,
  created_at: input.CreatedAt,
  documents: (input.Documents ?? []).map(doc => ({
    id: doc.ID,
    type: doc.Type,
    url: doc.URL,
    sha256: doc.SHA256,
  })),
  visits: (input.Visits ?? []).map(visit => ({
    id: visit.ID,
    application_id: visit.ApplicationID,
    scheduled_at: visit.ScheduledAt,
    geotag:
      visit.GeotagLat != null && visit.GeotagLng != null ? { lat: visit.GeotagLat, lng: visit.GeotagLng } : null,
    photos: visit.Photos ?? [],
    checklist: visit.Checklist ?? {},
    status: visit.Status as Application['visits'][number]['status'],
    tksk_id: visit.TkskID,
  })),
  timeline: (input.Timeline ?? []).map(item => ({
    at: item.OccurredAt,
    by: item.Actor,
    action: item.Action,
    reason: item.Reason ?? undefined,
  })),
  survey: input.Survey
    ? {
        completed: input.Survey.Completed,
        submitted_at: input.Survey.SubmittedAt ?? undefined,
        status: input.Survey.Status as Application['survey'] extends { status: infer S } ? S : undefined,
        answers: input.Survey.Answers as Application['survey'] extends { answers: infer A } ? A : undefined,
      }
    : undefined,
  portal: input.Portal
    ? {
        phone: input.Portal.Phone,
        email: input.Portal.Email ?? undefined,
        pin: input.Portal.PIN ?? undefined,
        verificationStatus: input.Portal.VerificationStatus as Application['portal'] extends {
          verificationStatus: infer S
        }
          ? S
          : undefined,
        faceMatchPassed: input.Portal.FaceMatchPassed ?? undefined,
        livenessPassed: input.Portal.LivenessPassed ?? undefined,
      }
    : undefined,
})

export const mapUserResponse = (user: UserResponse): User => ({
  id: user.ID,
  name: user.Name,
  role: user.Role as User['role'],
  region_scope: user.RegionScope ?? [],
  nik: user.NIK ?? '',
  phone: user.Phone ?? undefined,
  pin: '',
})

export const mapConfigResponse = (cfg: SystemConfigResponse): Config => ({
  period: cfg.Period,
  thresholds: {
    ocr_min: Number((cfg.Thresholds as Record<string, unknown>)?.ocr_min ?? 0.7),
    face_min: Number((cfg.Thresholds as Record<string, unknown>)?.face_min ?? 0.7),
  },
  features: {
    enableAppeal: Boolean((cfg.Features as Record<string, unknown>)?.enableAppeal ?? false),
    enableOfflineTKSK: Boolean((cfg.Features as Record<string, unknown>)?.enableOfflineTKSK ?? false),
  },
})

export const mapBatchResponse = (batch: BatchResponse): Batch => ({
  id: batch.ID,
  code: batch.Code,
  status: batch.Status as Batch['status'],
  checksum: batch.Checksum ?? '',
  items: batch.Items ?? [],
})

export const mapDistributionResponse = (dist: DistributionResponse): Distribution => ({
  id: dist.ID,
  name: dist.Name,
  scheduled_at: dist.ScheduledAt,
  channel: dist.Channel as Distribution['channel'],
  location: dist.Location,
  batch_codes: dist.BatchCodes ?? [],
  beneficiaries: dist.Beneficiaries ?? [],
  notified: dist.Notified ?? [],
  status: dist.Status as Distribution['status'],
  notes: dist.Notes ?? undefined,
  created_by: dist.CreatedBy ?? '',
  created_at: dist.CreatedAt,
  updated_by: dist.UpdatedBy ?? '',
  updated_at: dist.UpdatedAt,
})

const mapClusteringCandidate = (candidate: ClusteringCandidateResponse): ClusteringCandidate => ({
  id: candidate.ID,
  name: candidate.Name,
  nik_mask: candidate.NikMask,
  region: toRegion(candidate.Region),
  cluster: candidate.Cluster as ClusteringCandidate['cluster'],
  priority: candidate.Priority as ClusteringCandidate['priority'],
  score: candidate.Score,
  beneficiaries: candidate.HouseholdSize,
  status: candidate.Status as ClusteringCandidate['status'],
  assignedTo: candidate.AssignedTo ?? undefined,
  reviewer: candidate.Reviewer ?? undefined,
  reviewedAt: candidate.ReviewedAt ?? undefined,
  notes: candidate.Notes ?? undefined,
})

export const mapClusteringRunResponse = (run: ClusteringRunResponse): ClusteringRun => ({
  id: run.ID,
  operator: run.Operator,
  startedAt: run.StartedAt,
  finishedAt: run.FinishedAt ?? '',
  parameters: {
    dataset: String(run.Parameters?.dataset ?? run.Parameters?.Dataset ?? 'Dataset'),
    window: String(run.Parameters?.window ?? run.Parameters?.Window ?? 'Window'),
    algorithm: String(run.Parameters?.algorithm ?? run.Parameters?.Algorithm ?? 'Algorithm'),
  },
  summary: {
    total: Number(run.Summary?.total ?? run.Summary?.Total ?? 0),
    tinggi: Number(run.Summary?.tinggi ?? run.Summary?.Tinggi ?? 0),
    sedang: Number(run.Summary?.sedang ?? run.Summary?.Sedang ?? 0),
    rendah: Number(run.Summary?.rendah ?? run.Summary?.Rendah ?? 0),
  },
  results: run.Candidates?.map(mapClusteringCandidate) ?? [],
})

export const mapAuditLogResponse = (log: AuditLogResponse) => ({
  at: log.OccurredAt,
  actor: log.Actor,
  entity: log.Entity,
  action: log.Action,
  reason: log.Reason ?? undefined,
})

export const mapVisitResponse = (visit: VisitResponse): Visit => ({
  id: visit.ID,
  application_id: visit.ApplicationID,
  scheduled_at: visit.ScheduledAt,
  geotag:
    visit.GeotagLat != null && visit.GeotagLng != null
      ? { lat: visit.GeotagLat, lng: visit.GeotagLng }
      : null,
  photos: visit.Photos ?? [],
  checklist: visit.Checklist ?? {},
  status: visit.Status as Visit['status'],
  tksk_id: visit.TkskID,
})

export const toSystemConfigPayload = (cfg: Config): UpdateSystemConfigPayload => ({
  period: cfg.period,
  thresholds: { ...cfg.thresholds },
  features: { ...cfg.features },
})
