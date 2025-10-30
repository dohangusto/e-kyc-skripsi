import type { KycSubmissionPort } from "@application/ports/submission-port";
import type { Applicant } from "@/domain/types";

export const submitKyc = (submitter: KycSubmissionPort) => async (
    applicant: Applicant,
    artifacts: {
        ktpImage?: File,
        selfieImage?: File,
    },
) => submitter.submit({applicant, artifacts});