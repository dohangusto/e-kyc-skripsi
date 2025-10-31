import type { StepKey } from "@domain/value-objects/kyc-flow";
import type { OcrResult } from "@domain/types";

export type KycProgress = {
  step: StepKey;
  ocr?: OcrResult;
};

export interface KycRepository {
  loadProgress(): Promise<KycProgress | null>;
  saveProgress(progress: KycProgress): Promise<void>;
  clearProgress(): Promise<void>;
}
