import { simulateRequest } from '@shared/simulate'
import type { ClusteringCandidate, ClusteringPriority, ClusteringRun, Region } from '@domain/types'

const CLUSTERS: Array<ClusteringCandidate['cluster']> = ['PKH', 'BPNT', 'PBI', 'LAINNYA']
const NAMES = ['Siti', 'Budi', 'Andi', 'Aisyah', 'Putri', 'Rizal', 'Nur', 'Ahmad', 'Fajar', 'Dewi']
const SURNAMES = ['Aminah', 'Saputra', 'Hartono', 'Lestari', 'Wijaya', 'Pratama']
const REGIONS: Region[] = [
  { prov: 'Kepri', kab: 'Batam', kec: 'Sekupang', kel: 'Tg Riau' },
  { prov: 'Kepri', kab: 'Batam', kec: 'Nongsa', kel: 'Kabil' },
  { prov: 'Kepri', kab: 'Batam', kec: 'Sagulung', kel: 'Sungai Langkai' },
  { prov: 'Kepri', kab: 'Batam', kec: 'Batam Kota', kel: 'Belian' },
  { prov: 'Kepri', kab: 'Tanjung Pinang', kec: 'Bukit Bestari', kel: 'Dompak' },
]

export type ClusteringParams = {
  dataset: string
  window: string
  algorithm: string
}

function randomPriority(score: number): ClusteringPriority {
  if (score >= 0.8) return 'TINGGI'
  if (score >= 0.6) return 'SEDANG'
  return 'RENDAH'
}

function randomNik() {
  return '************' + Math.floor(1000 + Math.random() * 9000)
}

function sample<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function buildCandidate(seed: number): ClusteringCandidate {
  const region = sample(REGIONS)
  const cluster = sample(CLUSTERS)
  const score = Number((0.45 + Math.random() * 0.5).toFixed(2))
  return {
    id: `BEN-${seed.toString(36)}-${Math.floor(Math.random() * 1e4)}`,
    name: `${sample(NAMES)} ${sample(SURNAMES)}`,
    nik_mask: randomNik(),
    region,
    cluster,
    priority: randomPriority(score),
    score,
    beneficiaries: Math.floor(1 + Math.random() * 5),
    status: 'PENDING_REVIEW',
  }
}

export async function triggerClustering(params: ClusteringParams, operator: string): Promise<ClusteringRun> {
  return simulateRequest(() => {
    const started = new Date()
    const totalCandidates = 18 + Math.floor(Math.random() * 8)
    const results: ClusteringCandidate[] = Array.from({ length: totalCandidates }).map((_, idx) => buildCandidate(idx))
    const summary = results.reduce(
      (acc, c) => {
        acc.total += 1
        if (c.priority === 'TINGGI') acc.tinggi += 1
        else if (c.priority === 'SEDANG') acc.sedang += 1
        else acc.rendah += 1
        return acc
      },
      { total: 0, tinggi: 0, sedang: 0, rendah: 0 },
    )

    const finished = new Date(started.getTime() + 1000 + Math.random() * 1200)

    const run: ClusteringRun = {
      id: `CLUST-${started.getTime().toString(36)}-${Math.floor(Math.random() * 1e3)}`,
      operator,
      startedAt: started.toISOString(),
      finishedAt: finished.toISOString(),
      parameters: params,
      summary,
      results,
    }

    return run
  }, { min: 900, max: 1800, failRate: 0.1 })
}
