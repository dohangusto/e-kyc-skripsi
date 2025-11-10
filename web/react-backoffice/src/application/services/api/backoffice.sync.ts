import type { Db } from '@domain/types'

import { BackofficeAPI } from './backoffice'
import {
  mapApplicationResponse,
  mapAuditLogResponse,
  mapBatchResponse,
  mapClusteringRunResponse,
  mapConfigResponse,
  mapDistributionResponse,
  mapUserResponse,
} from './backoffice.mappers'

export async function fetchBackofficeSnapshot(): Promise<Db> {
  const [
    applicationsRes,
    usersRes,
    configRes,
    batchesRes,
    distributionsRes,
    clusteringRunsRes,
    auditRes,
  ] = await Promise.all([
    BackofficeAPI.listApplications(),
    BackofficeAPI.listUsers(),
    BackofficeAPI.getConfig(),
    BackofficeAPI.listBatches(),
    BackofficeAPI.listDistributions(),
    BackofficeAPI.listClusteringRuns(),
    BackofficeAPI.listAuditLogs(),
  ])

  return {
    applications: applicationsRes.data.map(mapApplicationResponse),
    users: usersRes.data.map(mapUserResponse),
    config: mapConfigResponse(configRes),
    batches: batchesRes.data.map(mapBatchResponse),
    distributions: distributionsRes.data.map(mapDistributionResponse),
    clusteringRuns: clusteringRunsRes.data.map(mapClusteringRunResponse),
    audit: auditRes.data.map(mapAuditLogResponse),
  }
}
