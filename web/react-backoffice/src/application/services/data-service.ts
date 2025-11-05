import type {
  Application,
  Batch,
  ClusteringCandidate,
  ClusteringRun,
  Db,
  Distribution,
  Visit,
  VisitStatus,
} from '@domain/types'
import { loadDb, saveDb } from '@shared/storage'
import { simulateRequest } from '@shared/simulate'

let db: Db = loadDb()

function commit() { saveDb(db) }

export const Data = {
  get: () => db,
  refresh() { db = loadDb(); return db },
  reset() { localStorage.removeItem('backoffice.db.v1'); db = loadDb(); return db },

  // Queries
  listApplications() { return db.applications },
  getApplication(id: string) { return db.applications.find(a => a.id === id) || null },
  listUsers() { return db.users },
  getConfig() { return db.config },
  setConfig(cfg: Db['config']) { db.config = cfg; commit() },
  listBatches() { return db.batches },
  listClusteringRuns() { return db.clusteringRuns },
  listDistributions() { return db.distributions },
  getClusteringRun(id: string) { return db.clusteringRuns.find(r => r.id === id) ?? null },

  // Mutations with simulateRequest
  async updateStatus(id: string, next: Application['status'], by: string, reason?: string) {
    return simulateRequest(() => {
      const a = this.getApplication(id)
      if (!a) throw new Error('not found')
      a.status = next
      a.timeline.push({ at: new Date().toISOString(), by, action: `STATUS:${next}`, reason })
      db.audit.push({ at: new Date().toISOString(), actor: by, entity: id, action: `STATUS:${next}`, reason })
      commit()
      return a
    })
  },

  async escalateToRisk(id: string, by: string, reason?: string) {
    return simulateRequest(() => {
      const a = this.getApplication(id)
      if (!a) throw new Error('not found')
      a.flags.escalated = true
      a.timeline.push({ at: new Date().toISOString(), by, action: 'ESCALATED', reason })
      db.audit.push({ at: new Date().toISOString(), actor: by, entity: id, action: 'ESCALATED', reason })
      commit(); return a
    })
  },

  async createVisit(appId: string, payload: Pick<Visit, 'scheduled_at' | 'tksk_id'>, by: string) {
    return simulateRequest(() => {
      const a = this.getApplication(appId)
      if (!a) throw new Error('not found')
      const v: Visit = { id: `VST-${Math.floor(Math.random()*100000)}`, scheduled_at: payload.scheduled_at, geotag: null, photos: [], checklist: {}, status: 'PLANNED', tksk_id: payload.tksk_id }
      a.visits.push(v)
      a.status = 'FIELD_VISIT'
      a.timeline.push({ at: new Date().toISOString(), by, action: 'VISIT:CREATED' })
      commit(); return v
    })
  },

  async setVisitStatus(appId: string, visitId: string, status: VisitStatus, by: string, reason?: string) {
    return simulateRequest(() => {
      const a = this.getApplication(appId)
      if (!a) throw new Error('not found')
      const v = a.visits.find(v => v.id === visitId)
      if (!v) throw new Error('visit not found')
      v.status = status
      a.timeline.push({ at: new Date().toISOString(), by, action: `VISIT:${status}`, reason })
      commit(); return v
    })
  },

  async addVisitArtifacts(appId: string, visitId: string, data: Partial<Pick<Visit, 'geotag' | 'photos' | 'checklist'>>, by: string) {
    return simulateRequest(() => {
      const a = this.getApplication(appId)
      if (!a) throw new Error('not found')
      const v = a.visits.find(v => v.id === visitId)
      if (!v) throw new Error('visit not found')
      if (data.geotag) v.geotag = data.geotag
      if (data.photos) v.photos = data.photos
      if (data.checklist) v.checklist = { ...v.checklist, ...data.checklist }
      a.timeline.push({ at: new Date().toISOString(), by, action: 'VISIT:UPDATED' })
      commit(); return v
    })
  },

  async createBatch(code: string, items: string[], by: string) {
    return simulateRequest(() => {
      const b: Batch = { id: `BATCH-${Math.floor(Math.random()*1000)}`, code, status: 'DRAFT', items, checksum: `cs-${Math.floor(Math.random()*1e6)}` }
      db.batches.push(b)
      db.audit.push({ at: new Date().toISOString(), actor: by, entity: b.id, action: 'BATCH:CREATED' })
      commit(); return b
    })
  },

  async setBatchStatus(id: string, status: Batch['status'], by: string) {
    return simulateRequest(() => {
      const b = db.batches.find(x => x.id === id)
      if (!b) throw new Error('batch not found')
      b.status = status
      db.audit.push({ at: new Date().toISOString(), actor: by, entity: id, action: `BATCH:${status}` })
      commit(); return b
    })
  },

  async linkDuplicate(appId: string, candidateId: string, by: string, note?: string) {
    return simulateRequest(() => {
      const a = this.getApplication(appId)
      if (!a) throw new Error('not found')
      a.flags.duplicate_confirmed = true
      a.timeline.push({ at: new Date().toISOString(), by, action: `DUPLICATE_CONFIRMED:${candidateId}`, reason: note })
      db.audit.push({ at: new Date().toISOString(), actor: by, entity: appId, action: 'DUPLICATE_CONFIRMED', reason: note })
      commit(); return a
    })
  },

  async ignoreDuplicate(appId: string, by: string, note?: string) {
    return simulateRequest(() => {
      const a = this.getApplication(appId)
      if (!a) throw new Error('not found')
      a.flags.duplicate_face = false
      a.flags.duplicate_nik = false
      a.timeline.push({ at: new Date().toISOString(), by, action: 'DUPLICATE_IGNORED', reason: note })
      db.audit.push({ at: new Date().toISOString(), actor: by, entity: appId, action: 'DUPLICATE_IGNORED', reason: note })
      commit(); return a
    })
  },

  recordClusteringRun(run: ClusteringRun) {
    db.clusteringRuns = [run, ...db.clusteringRuns].slice(0, 10)
    db.audit.push({
      at: new Date().toISOString(),
      actor: run.operator,
      entity: run.id,
      action: 'CLUSTERING:COMPLETED',
      reason: `${run.parameters.dataset} · ${run.parameters.algorithm}`,
    })
    commit()
    return run
  },

  assignClusteringCandidate(runId: string, candidateId: string, tkskId: string, by: string) {
    const run = this.getClusteringRun(runId)
    if (!run) throw new Error('run not found')
    const candidate = run.results.find(c => c.id === candidateId)
    if (!candidate) throw new Error('candidate not found')
    candidate.assignedTo = tkskId
    if (candidate.status === 'PENDING_REVIEW') {
      candidate.status = 'IN_REVIEW'
    }
    db.audit.push({ at: new Date().toISOString(), actor: by, entity: `${runId}:${candidateId}`, action: `CLUSTER_ASSIGN:${tkskId}` })
    commit()
    return candidate
  },

  setClusteringCandidateStatus(runId: string, candidateId: string, status: ClusteringCandidate['status'], by: string, notes?: string) {
    const run = this.getClusteringRun(runId)
    if (!run) throw new Error('run not found')
    const candidate = run.results.find(c => c.id === candidateId)
    if (!candidate) throw new Error('candidate not found')
    candidate.status = status
    candidate.reviewer = by
    candidate.reviewedAt = new Date().toISOString()
    candidate.notes = notes
    db.audit.push({ at: new Date().toISOString(), actor: by, entity: `${runId}:${candidateId}`, action: `CLUSTER_STATUS:${status}`, reason: notes })
    commit()
    return candidate
  },

  async createDistribution(payload: Pick<Distribution, 'name' | 'scheduled_at' | 'channel' | 'location' | 'batch_codes' | 'beneficiaries' | 'notes'>, by: string) {
    return simulateRequest(() => {
      const now = new Date().toISOString()
      const distribution: Distribution = {
        id: `DIST-${Math.floor(Math.random() * 100000)}`,
        name: payload.name,
        scheduled_at: payload.scheduled_at,
        channel: payload.channel,
        location: payload.location,
        batch_codes: [...payload.batch_codes],
        beneficiaries: [...payload.beneficiaries],
        notified: [],
        status: 'PLANNED',
        notes: payload.notes,
        created_by: by,
        created_at: now,
        updated_by: by,
        updated_at: now,
      }
      db.distributions.push(distribution)
      db.audit.push({ at: now, actor: by, entity: distribution.id, action: 'DISTRIBUTION:CREATED' })
      commit()
      return distribution
    })
  },

  async updateDistributionStatus(id: string, status: Distribution['status'], by: string) {
    return simulateRequest(() => {
      const distribution = db.distributions.find(d => d.id === id)
      if (!distribution) throw new Error('distribution not found')
      distribution.status = status
      distribution.updated_at = new Date().toISOString()
      distribution.updated_by = by
      db.audit.push({ at: distribution.updated_at, actor: by, entity: id, action: `DISTRIBUTION:${status}` })
      commit()
      return distribution
    })
  },

  async notifyDistribution(id: string, beneficiaries: string[], by: string) {
    return simulateRequest(() => {
      const distribution = db.distributions.find(d => d.id === id)
      if (!distribution) throw new Error('distribution not found')
      const now = new Date().toISOString()
      const actual: string[] = []
      beneficiaries.forEach(beneficiaryId => {
        if (!distribution.beneficiaries.includes(beneficiaryId)) return
        if (!distribution.notified.includes(beneficiaryId)) {
          distribution.notified.push(beneficiaryId)
          actual.push(beneficiaryId)
        }
        const app = db.applications.find(a => a.id === beneficiaryId)
        if (app && app.status !== 'DISBURSED') {
          app.status = 'DISBURSED'
          app.timeline.push({ at: now, by, action: 'STATUS:DISBURSED', reason: `Notifikasi ${distribution.channel}` })
        }
      })
      if (!actual.length) return distribution
      distribution.updated_at = now
      distribution.updated_by = by
      db.audit.push({ at: now, actor: by, entity: id, action: 'DISTRIBUTION:NOTIFIED', reason: actual.join(',') })
      commit()
      return distribution
    })
  },
}
