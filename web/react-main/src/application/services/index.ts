import { extractKtp } from "@application/usecases/extract-ktp";
import { compareFace } from "@application/usecases/face-match";
import { checkLiveness } from "@application/usecases/check-liveness";
import { submitKyc } from "@application/usecases/submit-kyc";

import type { KtpOcrPort } from "@application/ports/ocr-port";
import type { FaceMatchPort } from "@application/ports/face-match-port";
import type { LivenessPort } from "@application/ports/liveness-port";
import type { KycSubmissionPort } from "@application/ports/submission-port";

export const buildUsecases= (ports: {
    ocr: KtpOcrPort;
    face: FaceMatchPort;
    live: LivenessPort;
    submitter: KycSubmissionPort;
}) => {
    return {
        extractKtp: extractKtp(ports.ocr),
        compareFace: compareFace(ports.face),
        checkLiveness: checkLiveness(ports.live),
        submitKyc: submitKyc(ports.submitter),
    };
}