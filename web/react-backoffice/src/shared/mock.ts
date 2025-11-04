import seed from './seed.json'
import { beneficiaries, type BeneficiarySeed } from './beneficiaries'
import type {
  Application,
  Batch,
  ClusteringCandidate,
  ClusteringRun,
  Config,
  Db,
  TimelineItem,
  User,
  Visit,
} from '@domain/types'

const maskNik = (nik: string) => nik.replace(/\d(?=\d{4})/g, '*')
const maskPhone = (phone: string) => phone.replace(/\d(?=\d{4})/g, '*')

const cloneVisit = (visit: Visit): Visit => ({
  ...visit,
  geotag: visit.geotag ? { ...visit.geotag } : null,
  photos: [...visit.photos],
  checklist: { ...visit.checklist },
})

const cloneTimeline = (timeline: TimelineItem[]): TimelineItem[] => timeline.map(entry => ({ ...entry }))

function toApplication(seedBeneficiary: BeneficiarySeed): Application {
  return {
    id: seedBeneficiary.applicationId,
    applicant: {
      name: seedBeneficiary.name,
      nik_mask: maskNik(seedBeneficiary.nik),
      dob: seedBeneficiary.dob,
      phone_mask: maskPhone(seedBeneficiary.phone),
    },
    region: seedBeneficiary.region,
    status: seedBeneficiary.status,
    scores: { ...seedBeneficiary.scores },
    flags: {
      duplicate_nik: seedBeneficiary.flags.duplicate_nik,
      duplicate_face: seedBeneficiary.flags.duplicate_face,
      device_anomaly: seedBeneficiary.flags.device_anomaly,
      similarity: seedBeneficiary.flags.similarity,
      candidates: seedBeneficiary.flags.candidates?.map(candidate => ({ ...candidate })),
    },
    assigned_to: seedBeneficiary.assignedTo ?? 'UNASSIGNED',
    aging_days: seedBeneficiary.agingDays,
    created_at: seedBeneficiary.createdAt,
    documents: seedBeneficiary.documents.map(doc => ({ ...doc })),
    visits: seedBeneficiary.visits.map(cloneVisit),
    timeline: cloneTimeline(seedBeneficiary.timeline),
  }
}

function toCandidate(seedBeneficiary: BeneficiarySeed): ClusteringCandidate {
  return {
    id: seedBeneficiary.applicationId,
    name: seedBeneficiary.name,
    nik_mask: maskNik(seedBeneficiary.nik),
    region: seedBeneficiary.region,
    cluster: seedBeneficiary.recommendedCluster,
    priority: seedBeneficiary.recommendedPriority,
    score: seedBeneficiary.clusterScore,
    beneficiaries: seedBeneficiary.householdSize,
    status: seedBeneficiary.clusterStatus,
    assignedTo: seedBeneficiary.assignedTo ?? null,
    reviewer: seedBeneficiary.reviewer,
    reviewedAt: seedBeneficiary.reviewedAt,
    notes: seedBeneficiary.clusterNotes,
  }
}

function createInitialClusteringRun(): ClusteringRun {
  const results = beneficiaries.map(toCandidate).sort((a, b) => b.score - a.score)
  const summary = results.reduce(
    (acc, candidate) => {
      acc.total += 1
      if (candidate.priority === 'TINGGI') acc.tinggi += 1
      else if (candidate.priority === 'SEDANG') acc.sedang += 1
      else acc.rendah += 1
      return acc
    },
    { total: 0, tinggi: 0, sedang: 0, rendah: 0 },
  )

  return {
    id: 'CLUST-SEED',
    operator: 'seed',
    startedAt: '2025-10-18T06:00:00Z',
    finishedAt: '2025-10-18T06:00:05Z',
    parameters: { dataset: '2025-Q4-Seeding', window: 'Rolling 90 hari', algorithm: 'k-means-v2' },
    summary,
    results,
  }
}

export function generate(): Db {
  const base = seed as unknown as Db
  const applications = beneficiaries.map(toApplication)
  const initialRun = createInitialClusteringRun()

  const batches = (base.batches as Batch[] | undefined)?.map(batch => ({
    ...batch,
    items: batch.items.filter(item => applications.some(app => app.id === item)),
  })) ?? []

  const db: Db = {
    applications,
    users: base.users as User[],
    config: base.config as Config,
    batches,
    audit: [],
    clusteringRuns: [initialRun, ...((base.clusteringRuns as ClusteringRun[] | undefined) ?? [])],
  }

  return db
}
