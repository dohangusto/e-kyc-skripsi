import type { KycSubmissionPort } from "@application/ports/submission-port";

export const MockSubmitter: KycSubmissionPort = {
    async submit() {
        await new Promise(r => setTimeout(r, 300));
        return {
            id: `KYC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
        };
    }
}