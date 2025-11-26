import { gatewayRequest } from "./gateway-client";

export type AuthSessionResponse = {
  token: string;
  userId: string;
  role: string;
  regionScope: string[];
  issuedAt: string;
  expiresAt: string;
};

export type RegionResponse = {
  Prov: string;
  Kab: string;
  Kec: string;
  Kel: string;
};

export type AuthUserResponse = {
  ID: string;
  Role: string;
  NIK?: string;
  Name: string;
  DOB?: string;
  Phone?: string;
  Email?: string;
  Region: RegionResponse;
  RegionScope: string[];
  Metadata?: Record<string, unknown>;
  CreatedAt?: string;
  UpdatedAt?: string;
};

export type AuthResultResponse = {
  session: AuthSessionResponse;
  user: AuthUserResponse;
};

export type EligibilityResponse = {
  eligible: boolean;
  reason?: string;
  user?: AuthUserResponse;
};

export type LoginBeneficiaryPayload = {
  phone: string;
  pin: string;
};

export type EkycSessionResponse = {
  id: string;
  userId?: string | null;
  status: string;
  faceMatchingStatus: string;
  livenessStatus: string;
  finalDecision: string;
  idCardUrl?: string | null;
  selfieWithIdUrl?: string | null;
  recordedVideoUrl?: string | null;
  faceMatchOverall?: string | null;
  livenessOverall?: string | null;
  rejectionReason?: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
};

export function loginBeneficiary(payload: LoginBeneficiaryPayload) {
  return gatewayRequest<AuthResultResponse>("/api/auth/beneficiary/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function checkBeneficiaryEligibility(payload: {
  name: string;
  nik: string;
}) {
  return gatewayRequest<EligibilityResponse>(
    "/api/auth/beneficiary/eligibility",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

export function fetchActiveSession(token: string) {
  return gatewayRequest<AuthSessionResponse>("/api/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function listEkycSessions(limit = 200) {
  const params = new URLSearchParams();
  if (limit) {
    params.set("limit", String(limit));
  }
  const query = params.toString();
  const suffix = query ? `?${query}` : "";
  return gatewayRequest<EkycSessionResponse[]>(`/api/ekyc/sessions${suffix}`);
}
