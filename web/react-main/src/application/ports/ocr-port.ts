import type { OcrResult } from "@/domain/types";

export interface KtpOcrPort { extract(image: File): Promise<OcrResult>; }