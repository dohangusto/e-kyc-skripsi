import { gatewayRequest } from "./gateway-client";

export type PortalDistributionResponse = {
  id: string;
  name: string;
  scheduled_at: string;
  channel: string;
  location: string;
  status: string;
  notes?: string | null;
  updated_at: string;
  batch_codes?: string[];
};

type PortalDistributionListResponse = {
  data?: PortalDistributionResponse[];
};

export async function fetchPortalDistributions(
  applicationId: string,
  token?: string,
) {
  const res = await gatewayRequest<PortalDistributionListResponse>(
    `/api/portal/distributions/${encodeURIComponent(applicationId)}`,
    {
      method: "GET",
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
    },
  );
  return res?.data ?? [];
}
