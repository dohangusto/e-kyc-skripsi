import { appEnv } from "@infrastructure/config/env";
import { getSession } from "@shared/session";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type QueryValue = string | number | boolean | undefined | null;

export type RequestOptions<TBody> = {
  method?: HttpMethod;
  headers?: Record<string, string>;
  query?: Record<string, QueryValue>;
  body?: TBody;
};

export class HttpClient {
  constructor(
    private readonly baseURL: string,
    private readonly defaultHeaders: Record<string, string> = {},
    private readonly authTokenProvider?: () => string | null,
  ) {}

  async request<TResponse, TBody = unknown>(
    path: string,
    options: RequestOptions<TBody> = {},
  ): Promise<TResponse> {
    const url = this.buildURL(path, options.query);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.defaultHeaders,
      ...options.headers,
    };
    const token = this.authTokenProvider?.();
    if (token && !headers.Authorization) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body: this.serializeBody(options.body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        errorText || `Request failed with status ${response.status}`,
      );
    }

    if (response.status === 204) {
      return undefined as TResponse;
    }

    return (await response.json()) as TResponse;
  }

  get<TResponse>(
    path: string,
    options: Omit<RequestOptions<never>, "method" | "body"> = {},
  ) {
    return this.request<TResponse>(path, { ...options, method: "GET" });
  }

  post<TResponse, TBody = unknown>(
    path: string,
    options: Omit<RequestOptions<TBody>, "method"> = {},
  ) {
    return this.request<TResponse, TBody>(path, { ...options, method: "POST" });
  }

  put<TResponse, TBody = unknown>(
    path: string,
    options: Omit<RequestOptions<TBody>, "method"> = {},
  ) {
    return this.request<TResponse, TBody>(path, { ...options, method: "PUT" });
  }

  patch<TResponse, TBody = unknown>(
    path: string,
    options: Omit<RequestOptions<TBody>, "method"> = {},
  ) {
    return this.request<TResponse, TBody>(path, {
      ...options,
      method: "PATCH",
    });
  }

  delete<TResponse>(
    path: string,
    options: Omit<RequestOptions<never>, "method" | "body"> = {},
  ) {
    return this.request<TResponse>(path, { ...options, method: "DELETE" });
  }

  private buildURL(path: string, query?: Record<string, QueryValue>) {
    const url = new URL(path, this.baseURL);
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        url.searchParams.set(key, String(value));
      });
    }
    return url.toString();
  }

  private serializeBody(body: unknown) {
    if (body === undefined || body === null) {
      return undefined;
    }
    if (body instanceof FormData || body instanceof Blob) {
      return body;
    }
    return JSON.stringify(body);
  }
}

const getSessionToken = () => getSession()?.token ?? null;

// Route all backoffice traffic through the gateway so policies/logging stay centralized.
export const backofficeHttpClient = new HttpClient(
  appEnv.services.apiGateway,
  {},
  getSessionToken,
);
export const gatewayHttpClient = backofficeHttpClient;
