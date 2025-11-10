export type RegionResponse = {
  Prov: string
  Kab: string
  Kec: string
  Kel: string
}

export type DocumentResponse = {
  ID: string
  ApplicationID: string
  Type: string
  URL: string
  SHA256: string
  CreatedAt: string
}

export type VisitResponse = {
  ID: string
  ApplicationID: string
  ScheduledAt: string
  GeotagLat: number | null
  GeotagLng: number | null
  Photos: string[]
  Checklist: Record<string, unknown>
  Status: string
  TkskID: string
  CreatedAt: string
}

export type TimelineItemResponse = {
  ID: number
  ApplicationID: string
  OccurredAt: string
  Actor: string
  Action: string
  Reason?: string
  Metadata: Record<string, unknown>
}

export type SurveyStateResponse = {
  ApplicationID: string
  Completed: boolean
  SubmittedAt?: string
  Status?: string
  Answers?: Record<string, unknown>
}

export type PortalInfoResponse = {
  ApplicationID: string
  Phone: string
  Email?: string
  PIN?: string
  VerificationStatus?: string
  FaceMatchPassed?: boolean
  LivenessPassed?: boolean
}

export type FlagResponse = Record<string, unknown>

export type BackofficeApplicationResponse = {
  ID: string
  ApplicantName: string
  ApplicantNikMask: string
  ApplicantDOB: string
  ApplicantPhone: string
  Region: RegionResponse
  Status: string
  AssignedTo?: string
  AgingDays: number
  ScoreOCR: number
  ScoreFace: number
  ScoreLiveness: string
  Flags: FlagResponse
  CreatedAt: string
  UpdatedAt: string
  Documents?: DocumentResponse[]
  Visits?: VisitResponse[]
  Timeline?: TimelineItemResponse[]
  Survey?: SurveyStateResponse
  Portal?: PortalInfoResponse
}

export type ApplicationSummaryResponse = {
  id: string
  applicantName: string
  status: string
}

export type UserResponse = {
  ID: string
  Role: string
  NIK?: string
  Name: string
  DOB?: string
  Phone?: string
  Email?: string
  Region: RegionResponse
  RegionScope: string[]
  Metadata: Record<string, unknown>
  CreatedAt: string
  UpdatedAt: string
}

export type BatchResponse = {
  ID: string
  Code: string
  Status: string
  Checksum?: string
  CreatedAt: string
  UpdatedAt: string
  Items: string[]
}

export type DistributionResponse = {
  ID: string
  Name: string
  ScheduledAt: string
  Channel: string
  Location: string
  Status: string
  Notes?: string
  CreatedBy?: string
  CreatedAt: string
  UpdatedBy?: string
  UpdatedAt: string
  BatchCodes: string[]
  Beneficiaries: string[]
  Notified: string[]
}

export type ClusteringCandidateResponse = {
  ID: string
  RunID: string
  Name: string
  NikMask: string
  Region: RegionResponse
  Cluster: string
  Priority: string
  Score: number
  HouseholdSize: number
  Status: string
  AssignedTo?: string
  Reviewer?: string
  ReviewedAt?: string
  Notes?: string
}

export type ClusteringRunResponse = {
  ID: string
  Operator: string
  StartedAt: string
  FinishedAt?: string
  Parameters: Record<string, unknown>
  Summary: Record<string, unknown>
  Candidates: ClusteringCandidateResponse[]
}

export type AuditLogResponse = {
  ID: number
  OccurredAt: string
  Actor: string
  Entity: string
  Action: string
  Reason?: string
  Metadata: Record<string, unknown>
}

export type SystemConfigResponse = {
  Period: string
  Thresholds: Record<string, unknown>
  Features: Record<string, unknown>
  UpdatedAt: string
}

export type UpdateSystemConfigPayload = {
  period: string
  thresholds: Record<string, unknown>
  features: Record<string, unknown>
}

export type UpdateApplicationStatusPayload = {
  status: string
  actor: string
  reason?: string
}

export type EscalateApplicationPayload = {
  actor: string
  reason?: string
}

export type ConfirmDuplicatePayload = {
  candidateId: string
  actor: string
  note?: string
}

export type IgnoreDuplicatePayload = {
  actor: string
  note?: string
}

export type CreateVisitPayload = {
  actor: string
  scheduledAt: string
  tkskId: string
}

export type UpdateVisitPayload = {
  actor: string
  status?: string
  geotag?: { lat: number; lng: number }
  photos?: string[]
  checklist?: Record<string, unknown>
  reason?: string
}

export type CreateBatchPayload = {
  code: string
  items: string[]
  actor: string
}

export type UpdateBatchStatusPayload = {
  status: string
  actor: string
}

export type CreateDistributionPayload = {
  actor: string
  name: string
  scheduledAt: string
  channel: string
  location: string
  notes?: string
  batchCodes: string[]
  beneficiaries: string[]
}

export type UpdateDistributionStatusPayload = {
  actor: string
  status: string
}

export type NotifyDistributionPayload = {
  actor: string
  beneficiaries: string[]
}

export type TriggerClusteringRunPayload = {
  operator: string
  parameters: {
    dataset: string
    window: string
    algorithm: string
  }
  sampleSize?: number
}

export type AssignClusteringCandidatePayload = {
  actor: string
  tkskId: string
}

export type UpdateClusteringCandidateStatusPayload = {
  actor: string
  status: string
  notes?: string
}

export type AuthSessionResponse = {
  token: string
  userId: string
  role: string
  regionScope: string[]
  issuedAt: string
}

export type AuthUserResponse = {
  ID: string
  Role: string
  Name: string
  NIK?: string
  Region: RegionResponse
  RegionScope: string[]
}

export type AuthResultResponse = {
  session: AuthSessionResponse
  user: AuthUserResponse
}

export type LoginAdminPayload = {
  nik: string
  pin: string
}

export type LoginBeneficiaryPayload = {
  phone: string
  pin: string
}

export type OverviewResponse = {
  applications: number
  pendingVisits: number
  beneficiaries: number
}

export type ListEnvelope<T> = {
  data: T
}
