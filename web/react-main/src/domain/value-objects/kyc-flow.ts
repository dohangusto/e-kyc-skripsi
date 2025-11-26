export const KYC_STEPS = [
  "IDENTITY_LOOKUP",
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
  IDENTITY_LOOKUP: "Cek Nama & NIK",
  UPLOAD_KTP: "Kamera KTP",
  OCR_REVIEW: "Isi Data KTP",
  SELFIE: "Selfie + Pegang KTP",
  FACE_MATCH: "Komparasi Wajah",
  LIVENESS: "Liveness",
  DATA_ENTRY: "Data Tambahan",
  REVIEW_SUBMIT: "Review & Submit",
  DONE: "Selesai",
};

export const INITIAL_STEP: StepKey = KYC_STEPS[0];
