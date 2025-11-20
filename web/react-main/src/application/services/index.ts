import { compareFace } from "@application/usecases/face-match";
import { checkLiveness } from "@application/usecases/check-liveness";
import { submitKyc } from "@application/usecases/submit-kyc";

import type { FaceMatchPort } from "@application/ports/face-match-port";
import type { LivenessPort } from "@application/ports/liveness-port";
import type { KycSubmissionPort } from "@application/ports/submission-port";

export const buildUsecases = (ports: {
  face: FaceMatchPort;
  live: LivenessPort;
  submitter: KycSubmissionPort;
}) => {
  return {
    compareFace: compareFace(ports.face),
    checkLiveness: checkLiveness(ports.live),
    submitKyc: submitKyc(ports.submitter),
  };
};
