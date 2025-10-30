import type { Applicant } from "@/domain/types";

export interface KycSubmissionPort {
    submit(
        payload: {
            applicant: Applicant,
            artifacts: {
                ktpImage?: File,
                selfieImage?: File,
            },
        },
    ): Promise<{id: string}>;
}