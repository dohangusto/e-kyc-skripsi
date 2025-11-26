import type { Applicant } from "@domain/types";

export type SurveyAnswers = {
  partB: {
    householdRole: string;
    dependents: number | "";
    schoolChildren: number | "";
    toddlers: string;
    elderly: string;
    disability: string;
  };
  partC: {
    education: string;
    occupation: string;
    income: string;
  };
  partD: {
    homeOwnership: string;
    floorType: string;
    wallType: string;
    roofType: string;
    cookingFuel: string;
    toiletType: string;
    toiletFacility: string;
    sewageDisposal: string;
    waterSource: string;
    lighting: string;
  };
  partE: {
    movableAssets: string;
    movableAssetCount: number | "";
    immovableAssets: string;
    immovableAssetCount: number | "";
    landOwnership: string;
  };
};

export type SurveyStatus =
  | "belum-dikumpulkan"
  | "antrean"
  | "diperiksa"
  | "disetujui"
  | "ditolak";

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
