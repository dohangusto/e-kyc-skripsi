import type { VerificationCase } from "@/domain/entities/verification-case";

const now = new Date();
const yesterday = new Date(now);
yesterday.setDate(now.getDate() - 1);

export const mockCases: VerificationCase[] = [
  {
    id: "case-1001",
    applicant: {
      id: "app-2001",
      fullName: "Alyssa Hart",
      nationalId: "ID-2391-77",
      dateOfBirth: "1994-06-12",
    },
    status: "EKYC_IN_PROGRESS",
    signals: {
      faceMatch: "PENDING",
      liveness: "UNCERTAIN",
      ocrConsistency: "CONSISTENT",
      restriction: "FULL",
    },
    createdAt: yesterday.toISOString(),
    updatedAt: now.toISOString(),
  },
  {
    id: "case-1002",
    applicant: {
      id: "app-2002",
      fullName: "Noah Grant",
      nationalId: "ID-1148-05",
      dateOfBirth: "1989-02-03",
    },
    status: "FALLBACK_REVIEW",
    signals: {
      faceMatch: "MISMATCH",
      liveness: "PASS",
      ocrConsistency: "INCONSISTENT",
      restriction: "LIMITED",
    },
    createdAt: yesterday.toISOString(),
    updatedAt: now.toISOString(),
  },
  {
    id: "case-1003",
    applicant: {
      id: "app-2003",
      fullName: "Maya Flores",
      nationalId: "ID-8891-22",
      dateOfBirth: "1997-09-30",
    },
    status: "APPROVED_MANUAL",
    signals: {
      faceMatch: "MATCH",
      liveness: "PASS",
      ocrConsistency: "CONSISTENT",
      restriction: "FULL",
    },
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  },
  {
    id: "case-1004",
    applicant: {
      id: "app-2004",
      fullName: "Ethan Cole",
      nationalId: "ID-4920-61",
      dateOfBirth: "1992-11-18",
    },
    status: "AUTO_VERIFIED",
    signals: {
      faceMatch: "MATCH",
      liveness: "PASS",
      ocrConsistency: "CONSISTENT",
      restriction: "FULL",
    },
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  },
  {
    id: "case-1005",
    applicant: {
      id: "app-2005",
      fullName: "Rina Abbott",
      nationalId: "ID-5512-18",
      dateOfBirth: "1986-04-05",
    },
    status: "NEED_REVERIFY",
    signals: {
      faceMatch: "PENDING",
      liveness: "UNCERTAIN",
      ocrConsistency: "CONSISTENT",
      restriction: "LIMITED",
    },
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  },
];
