import { gatewayRequest } from "./gateway-client";
import type { PortalBatch } from "@domain/entities/batch";

type PortalBatchResponse = {
  id?: string;
  code: string;
  created_at: string;
};

type PortalBatchEnvelope =
  | { data?: PortalBatchResponse | null }
  | { data?: PortalBatchResponse[] | null };

const mapBatch = (raw: PortalBatchResponse): PortalBatch => ({
  id: raw.id ?? raw.code,
  code: raw.code,
  createdAt: raw.created_at,
});

export async function fetchPortalBatches(
  applicationId: string,
  token?: string,
) {
  const res = await gatewayRequest<PortalBatchEnvelope>(
    `/api/portal/batches/${encodeURIComponent(applicationId)}`,
    {
      method: "GET",
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
    },
  );
  if (!res || res.data == null) return [];
  const payload = res.data as PortalBatchResponse | PortalBatchResponse[];
  if (Array.isArray(payload)) {
    return payload.map(mapBatch);
  }
  return [mapBatch(payload)];
}
