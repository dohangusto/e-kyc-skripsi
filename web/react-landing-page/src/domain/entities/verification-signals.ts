import type { FaceMatch, Liveness, OcrConsistency, Restriction } from "@/domain/types";

export type VerificationSignals = {
  faceMatch: FaceMatch;
  liveness: Liveness;
  ocrConsistency: OcrConsistency;
  restriction: Restriction;
};
