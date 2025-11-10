import type { Db } from '@domain/types'
import type { ListEnvelope } from './backoffice.types'

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

const mapListResponse = <TResponse, TMapped>(
  response: ListEnvelope<TResponse[]> | null | undefined,
  mapper: (item: TResponse) => TMapped,
) => {
  const data = response?.data
  if (!Array.isArray(data)) {
    return []
  }
  return data.map(mapper)
}

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
    applications: mapListResponse(applicationsRes, mapApplicationResponse),
    users: mapListResponse(usersRes, mapUserResponse),
    config: mapConfigResponse(configRes),
    batches: mapListResponse(batchesRes, mapBatchResponse),
    distributions: mapListResponse(distributionsRes, mapDistributionResponse),
    clusteringRuns: mapListResponse(clusteringRunsRes, mapClusteringRunResponse),
    audit: mapListResponse(auditRes, mapAuditLogResponse),
  }
}
