import type { KtpOcrPort } from "@application/ports/ocr-port";

export const MockOCR: KtpOcrPort = {
    async extract() {
        await new Promise(r => setTimeout(r, 300));
        return {
            number: "1275 9901 2025 0001",
            name: "IVANDOHAN",
            birthDate: "2001-05-22",
            address: "Batam, Kepulauan Riau",
            confidence: 0.93,
            rawText: "NIK 1275990120250001\nNama: IVAN DOHAN\nTTL: 22-05-2001\nAlamat: Batam, Kepri"
        };
    }
};