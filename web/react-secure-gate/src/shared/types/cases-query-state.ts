import type { CaseStatus, Eligibility, FaceMatch, RiskLevel } from "@/domain/types";

export type AssignedFilter = "ALL" | "ASSIGNED_TO_ME" | "UNASSIGNED";
export type TriageTagFilter = "ALL" | "FOLLOW_UP" | "SUSPICIOUS" | "NONE";

export type CasesQueryState = {
  query: string;
  status: CaseStatus | "ALL";
  eligibility: "ALL" | Eligibility;
  faceMatch: "ALL" | FaceMatch;
  riskLevel: "ALL" | RiskLevel;
  sort: "NEWEST" | "OLDEST";
  pageSize: number;
  triageTag: TriageTagFilter;
  assigned: AssignedFilter;
};
