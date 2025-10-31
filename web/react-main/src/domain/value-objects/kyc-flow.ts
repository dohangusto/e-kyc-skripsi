export const KYC_STEPS = [
  "UPLOAD_KTP",
  "OCR_REVIEW",
  "SELFIE",
  "FACE_MATCH",
  "LIVENESS",
  "DATA_ENTRY",
  "REVIEW_SUBMIT",
  "DONE",
] as const;

export type StepKey = (typeof KYC_STEPS)[number];

export const STEP_LABELS: Record<StepKey, string> = {
  UPLOAD_KTP: "Kamera KTP",
  OCR_REVIEW: "Review OCR",
  SELFIE: "Selfie + Pegang KTP",
  FACE_MATCH: "Komparasi Wajah",
  LIVENESS: "Liveness",
  DATA_ENTRY: "Data Tambahan",
  REVIEW_SUBMIT: "Review & Submit",
  DONE: "Selesai",
};

export const INITIAL_STEP: StepKey = KYC_STEPS[0];
