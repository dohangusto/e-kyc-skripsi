import type {
  CaseStatus,
  Eligibility,
  FaceMatch,
  Liveness,
  RiskLevel,
} from "@/domain/types";
import type { Applicant } from "@/domain/entities/applicant";
import type { VerificationSignals } from "@/domain/entities/verification-signals";

export type Evidence = {
  ktpImageUrl: string;
  ktpOcr: {
    nik: string;
    name: string;
    birthDate?: string;
    address?: string;
    confidence: number;
    flags?: string[];
  };
  selfieWithKtpUrl: string;
  liveness: {
    result: Liveness;
    gestures: string[];
    score?: number;
  };
  faceMatch: {
    result: FaceMatch;
    score?: number;
  };
};

export type VerificationCase = {
  id: string;
  applicant: Applicant;
  status: CaseStatus;
  signals: VerificationSignals;
  createdAt: string;
  updatedAt?: string;
  decidedAt?: string;
  riskLevel: RiskLevel;
  eligibility: Eligibility;
  evidence: Evidence;
};
