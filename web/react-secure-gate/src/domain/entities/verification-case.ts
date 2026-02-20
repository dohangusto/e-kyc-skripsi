import type { CaseStatus } from "@/domain/types";
import type { Applicant } from "@/domain/entities/applicant";
import type { VerificationSignals } from "@/domain/entities/verification-signals";

export type VerificationCase = {
  id: string;
  applicant: Applicant;
  status: CaseStatus;
  signals: VerificationSignals;
  createdAt: string;
  updatedAt: string;
};
