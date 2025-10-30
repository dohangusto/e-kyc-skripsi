import type { Applicant } from "@domain/types";

export const createApplicant = (init: Partial<Applicant>): Applicant => {
    const required = ["number", "name", "birthDate", "address", "phone", "email"] as const;
    for (const key of required) {
        if (!init[key]) throw new Error(`Missing required field: ${key}`);
    }

    return init as Applicant
}