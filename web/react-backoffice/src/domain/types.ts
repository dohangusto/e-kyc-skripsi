export type AppStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'DESK_REVIEW'
  | 'FIELD_VISIT'
  | 'FINAL_APPROVED'
  | 'FINAL_REJECTED'
  | 'RETURNED_FOR_REVISION'
  | 'DISBURSEMENT_READY'
  | 'DISBURSED'
  | 'DISBURSEMENT_FAILED'

export type VisitStatus = 'PLANNED' | 'IN_PROGRESS' | 'SUBMITTED' | 'VERIFIED'

export type Applicant = {
  name: string
  nik_mask: string
  dob: string
  phone_mask: string
}

export type Region = { prov: string; kab: string; kec: string; kel: string }

export type Doc = { id: string; type: 'KTP' | 'SELFIE' | string; url: string; sha256: string }

export type Visit = {
  id: string
  scheduled_at: string
  geotag: { lat: number; lng: number } | null
  photos: string[]
  checklist: Record<string, unknown>
  status: VisitStatus
  tksk_id: string
}

export type TimelineItem = { at: string; by: string; action: string; reason?: string }

export type Application = {
  id: string
  applicant: Applicant
  region: Region
  status: AppStatus
  scores: { ocr: number; face: number; liveness: 'OK' | 'NOK' | string }
  flags: {
    duplicate_nik: boolean
    duplicate_face: boolean
    device_anomaly: boolean
    similarity: number
    escalated?: boolean
    duplicate_confirmed?: boolean
    candidates?: Array<{ id: string; name: string; similarity: number; selfie_url?: string }>
  }
  assigned_to: string
  aging_days: number
  created_at: string
  documents: Doc[]
  visits: Visit[]
  timeline: TimelineItem[]
}

export type User = { id: string; name: string; role: 'ADMIN' | 'RISK' | 'TKSK' | 'AUDITOR'; region_scope: string[] }

export type Config = {
  period: string
  thresholds: { ocr_min: number; face_min: number }
  features: { enableAppeal: boolean; enableOfflineTKSK: boolean }
}

export type Batch = { id: string; code: string; status: 'DRAFT' | 'SIGNED' | 'EXPORTED' | 'SENT'; items: string[]; checksum: string }

export type ClusteringPriority = 'RENDAH' | 'SEDANG' | 'TINGGI'

export type ClusteringStatus = 'PENDING_REVIEW' | 'IN_REVIEW' | 'APPROVED'

export type ClusteringCandidate = {
  id: string
  name: string
  nik_mask: string
  region: Region
  cluster: 'PKH' | 'BPNT' | 'PBI' | 'LAINNYA'
  priority: ClusteringPriority
  score: number
  beneficiaries: number
  status: ClusteringStatus
  assignedTo?: string
  reviewer?: string
  reviewedAt?: string
  notes?: string
}

export type ClusteringRun = {
  id: string
  operator: string
  startedAt: string
  finishedAt: string
  parameters: { dataset: string; window: string; algorithm: string }
  summary: { total: number; tinggi: number; sedang: number; rendah: number }
  results: ClusteringCandidate[]
}

export type Db = {
  applications: Application[]
  users: User[]
  config: Config
  batches: Batch[]
  audit: Array<{ at: string; actor: string; entity: string; action: string; reason?: string }>
  clusteringRuns: ClusteringRun[]
}
