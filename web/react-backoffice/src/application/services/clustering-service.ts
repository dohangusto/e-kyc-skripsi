import { simulateRequest } from '@shared/simulate'
import { beneficiaries } from '@shared/beneficiaries'
import type { ClusteringCandidate, ClusteringRun } from '@domain/types'

export type ClusteringParams = {
  dataset: string
  window: string
  algorithm: string
}

const maskNik = (nik: string) => nik.replace(/\d(?=\d{4})/g, '*')

function jitter(base: number) {
  const value = base + (Math.random() - 0.5) * 0.08
  return Number(Math.min(0.99, Math.max(0.45, value)).toFixed(2))
}

export async function triggerClustering(params: ClusteringParams, operator: string): Promise<ClusteringRun> {
  return simulateRequest(() => {
    const started = new Date()
    const results: ClusteringCandidate[] = beneficiaries.map(beneficiary => ({
      id: beneficiary.applicationId,
      name: beneficiary.name,
      nik_mask: maskNik(beneficiary.nik),
      region: beneficiary.region,
      cluster: beneficiary.recommendedCluster,
      priority: beneficiary.recommendedPriority,
      score: jitter(beneficiary.clusterScore),
      beneficiaries: beneficiary.householdSize,
      status: 'PENDING_REVIEW',
      assignedTo: null,
    })).sort((a, b) => b.score - a.score)
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
