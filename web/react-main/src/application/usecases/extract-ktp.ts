import type { KtpOcrPort } from "@application/ports/ocr-port";

export const extractKtp = (ocr: KtpOcrPort) => async (image: File) => ocr.extract(image);