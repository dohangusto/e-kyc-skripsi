import { gatewayRequest } from "./gateway-client";

export type PortalNotificationResponse = {
  id: string;
  message: string;
  category: string;
  attachment_url?: string | null;
  created_at?: string;
  distribution_id?: string | null;
};

type PortalNotificationListResponse = {
  data?: PortalNotificationResponse[];
};

export async function fetchPortalNotifications(
  userId: string,
  token?: string,
  limit = 50,
) {
  const params = new URLSearchParams();
  if (limit) {
    params.set("limit", String(limit));
  }
  const query = params.toString();
  const suffix = query ? `?${query}` : "";
  const res = await gatewayRequest<PortalNotificationListResponse>(
    `/api/portal/notifications/${encodeURIComponent(userId)}${suffix}`,
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
