import type { Applicant } from "@domain/types";

export type SurveyAnswers = {
  partB: {
    householdMembers: number | "";
    schoolChildren: string;
    toddlers: string;
    elderly: string;
    disability: string;
  };
  partC: {
    education: string;
    occupation: string;
    income: string;
    extraIncome: string;
  };
  partD: {
    homeOwnership: string;
    floorType: string;
    wallType: string;
    roofType: string;
    vehicle: string;
    savings: string;
    lighting: string;
    waterSource: string;
    cookingFuel: string;
    toilet: string;
    wasteDisposal: string;
    sanitation: string;
  };
  partE: {
    healthCheck: string;
  };
};

export type SurveyStatus = "belum-dikumpulkan" | "antrean" | "diperiksa" | "disetujui" | "ditolak";

export type SurveyState = {
  completed: boolean;
  submittedAt?: string;
  answers?: SurveyAnswers;
  status?: SurveyStatus;
};

export type Account = {
  phone: string;
  pin?: string | null;
  submissionId: string;
  applicant: Applicant;
  createdAt: string;
  faceMatchPassed: boolean;
  livenessPassed: boolean;
  verificationStatus: "SEDANG_DITINJAU" | "DISETUJUI" | "DITOLAK";
  survey?: SurveyState;
};
