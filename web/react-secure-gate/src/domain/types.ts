export type Role = "VERIFIER" | "SUPERVISOR";

export type CaseStatus =
  | "ELIGIBILITY_FAILED"
  | "EKYC_IN_PROGRESS"
  | "EKYC_SUBMITTED"
  | "AUTO_VERIFIED"
  | "FALLBACK_REVIEW"
  | "APPROVED_MANUAL"
  | "REJECTED"
  | "NEED_REVERIFY";

export type FaceMatch = "MATCH" | "MISMATCH" | "PENDING";
export type Liveness = "PASS" | "FAIL" | "UNCERTAIN";
export type OcrConsistency = "CONSISTENT" | "INCONSISTENT";
export type Restriction = "FULL" | "LIMITED";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type Eligibility = "ELIGIBLE" | "INELIGIBLE";

export type Region = {
  province: string;
  city: string;
  district?: string;
};

export type DecisionType = "APPROVE_MANUAL" | "REJECT" | "REQUEST_REVERIFY";

export type DecisionPayload = {
  type: DecisionType;
  reasonCode: string;
  notes?: string;
};
