import { gatewayRequest } from "./gateway-client";

export type EkycSession = {
  id: string;
  status: string;
  faceMatchingStatus: string;
  livenessStatus: string;
  finalDecision: string;
  idCardUrl?: string | null;
  selfieWithIdUrl?: string | null;
  recordedVideoUrl?: string | null;
  faceMatchOverall?: string | null;
  livenessOverall?: string | null;
};

type ImagePayload = {
  content_base64: string;
  mime_type?: string;
};

export async function toImagePayload(file: File): Promise<ImagePayload> {
  const content_base64 = await fileToBase64(file);
  return { content_base64, mime_type: file.type || undefined };
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Gagal membaca file"));
        return;
      }
      const base64 = result.split(",")[1];
      resolve(base64 ?? "");
    };
    reader.onerror = () => reject(reader.error ?? new Error("Gagal membaca"));
    reader.readAsDataURL(file);
  });
}

export type ApplicantSubmission = {
  fullName: string;
  nik?: string;
  birthDate?: string;
  address?: string;
  phone: string;
  email?: string;
  pin?: string;
};

export function createEkycApi() {
  return {
    async createSession(userId?: string | null) {
      const body = userId ? { userId } : {};
      return gatewayRequest<EkycSession>("/ekyc/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },
    async uploadIdCard(sessionId: string, file: File) {
      const form = new FormData();
      form.append("file", file, file.name);
      return gatewayRequest<EkycSession>(
        `/ekyc/sessions/${sessionId}/id-card`,
        {
          method: "POST",
          body: form,
        },
      );
    },
    async uploadSelfie(sessionId: string, file: File) {
      const form = new FormData();
      form.append("file", file, file.name);
      return gatewayRequest<EkycSession>(
        `/ekyc/sessions/${sessionId}/selfie-with-id`,
        {
          method: "POST",
          body: form,
        },
      );
    },
    async startLiveness(
      sessionId: string,
      frames: ImagePayload[],
      gestures: string[],
    ) {
      return gatewayRequest<EkycSession>(
        `/ekyc/sessions/${sessionId}/liveness`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ frames, gestures }),
        },
      );
    },
    async getSession(sessionId: string) {
      return gatewayRequest<EkycSession>(`/ekyc/sessions/${sessionId}`);
    },
    async submitApplicant(sessionId: string, payload: ApplicantSubmission) {
      return gatewayRequest<EkycSession>(
        `/ekyc/sessions/${sessionId}/applicant`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
    },
  };
}
