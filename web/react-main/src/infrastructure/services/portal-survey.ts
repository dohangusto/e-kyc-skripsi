import type { SurveyAnswers, SurveyStatus } from "@domain/entities/account";
import { gatewayRequest } from "./gateway-client";

const authHeaders = (token?: string) =>
  token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};

export type PortalSurveyResponse = {
  applicationId: string;
  beneficiaryUserId: string;
  completed: boolean;
  submittedAt?: string;
  status?: string;
  answers?: SurveyAnswers;
};

type PortalSurveyApiResponse = {
  ApplicationID: string;
  BeneficiaryUserID: string;
  Completed: boolean;
  SubmittedAt?: string;
  Status?: string;
  Answers?: SurveyAnswers;
};

const mapPortalSurveyResponse = (
  raw?: PortalSurveyApiResponse | null,
): PortalSurveyResponse | undefined => {
  if (!raw) return undefined;
  return {
    applicationId: raw.ApplicationID,
    beneficiaryUserId: raw.BeneficiaryUserID,
    completed: !!raw.Completed,
    submittedAt: raw.SubmittedAt ?? undefined,
    status: raw.Status ?? undefined,
    answers: raw.Answers,
  };
};

export async function fetchPortalSurvey(applicationId: string, token?: string) {
  const result = await gatewayRequest<PortalSurveyApiResponse | undefined>(
    `/api/portal/surveys/${encodeURIComponent(applicationId)}`,
    {
      method: "GET",
      headers: authHeaders(token),
    },
  );
  return mapPortalSurveyResponse(result);
}

export async function savePortalSurveyDraft(
  applicationId: string,
  payload: { answers?: SurveyAnswers; status?: SurveyStatus },
  token?: string,
) {
  const response = await gatewayRequest<PortalSurveyApiResponse>(
    `/api/portal/surveys/${encodeURIComponent(applicationId)}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(token),
      },
      body: JSON.stringify(payload),
    },
  );
  return mapPortalSurveyResponse(response)!;
}

export async function submitPortalSurvey(
  applicationId: string,
  payload: { answers?: SurveyAnswers; status?: SurveyStatus },
  token?: string,
) {
  const response = await gatewayRequest<PortalSurveyApiResponse>(
    `/api/portal/surveys/${encodeURIComponent(applicationId)}/submit`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(token),
      },
      body: JSON.stringify(payload),
    },
  );
  return mapPortalSurveyResponse(response)!;
}
