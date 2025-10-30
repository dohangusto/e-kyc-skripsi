import type { FaceMatchPort } from "@application/ports/face-match-port";
import { ENV } from "@infrastructure/config/env";

export const MockFaceMatch: FaceMatchPort = {
    async compare() {
        await new Promise(r => setTimeout(r, 250));
        return {
            score: 0.8,
            threshold: ENV.FACE_THRESHOLD,
        };
    }
};