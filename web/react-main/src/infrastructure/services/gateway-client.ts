function resolveDefaultGateway() {
  if (typeof window !== "undefined") {
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      return "http://127.0.0.1:8080";
    }
    return window.location.origin.replace(/\/$/, "");
  }
  return "http://127.0.0.1:8080";
}

const API_BASE =
  (import.meta.env.VITE_GATEWAY_URL as string | undefined)?.replace(
    /\/$/,
    "",
  ) ?? resolveDefaultGateway();

async function parseError(response: Response) {
  try {
    const data = await response.json();
    if (typeof data?.message === "string") return data.message;
    if (typeof data?.error === "string") return data.error;
  } catch {
    // ignore json parse issues, fall back to text
  }
  const text = await response.text();
  return text || "Terjadi kesalahan pada server";
}

export async function gatewayRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init);
  if (!response.ok) {
    const message = await parseError(response);
    throw new Error(message);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export { API_BASE };
