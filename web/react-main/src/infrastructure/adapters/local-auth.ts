import type { Account, SurveyState } from "@domain/entities/account";
import type { AuthRepository } from "@domain/repositories/auth-repository";
import { beneficiaries } from "@dummies/beneficiaries";
import type { PortalInfo, VerificationStatus } from "@dummies/schema";

const formatAddress = (region: { prov: string; kab: string; kec: string; kel: string }) =>
  `${region.kel}, ${region.kec}, ${region.kab}, ${region.prov}`;

const verificationFromStatus = (status: string | undefined): VerificationStatus => {
  switch (status) {
    case "FINAL_APPROVED":
    case "DISBURSED":
    case "DISBURSEMENT_READY":
      return "DISETUJUI";
    case "FINAL_REJECTED":
    case "DISBURSEMENT_FAILED":
      return "DITOLAK";
    default:
      return "SEDANG_DITINJAU";
  }
};

const normalizeSurvey = (
  source?: {
    completed: boolean;
    submittedAt?: string;
    status?: SurveyState["status"];
    answers?: SurveyState["answers"];
  },
): SurveyState | undefined => {
  if (source) {
    return {
      completed: source.completed ?? false,
      status: source.status ?? "belum-dikumpulkan",
      submittedAt: source.submittedAt,
      answers: source.answers,
    };
  }
  return undefined;
};

const defaultEmail = (name: string) =>
  `${name.toLowerCase().replace(/\s+/g, ".") || "user"}@contoh.id`;

const buildAccount = (seed: (typeof beneficiaries)[number]): Account => {
  const mergedPortal: PortalInfo = {
    phone: seed.portal?.phone ?? seed.phone,
    email: seed.portal?.email ?? defaultEmail(seed.name),
    pin: seed.portal?.pin ?? null,
    verificationStatus:
      seed.portal?.verificationStatus ?? verificationFromStatus(seed.status),
    faceMatchPassed: seed.portal?.faceMatchPassed ?? seed.scores.face >= 0.8,
    livenessPassed: seed.portal?.livenessPassed ?? seed.scores.liveness === "OK",
  };

  const survey =
    normalizeSurvey(
      seed.survey && {
        completed: seed.survey.completed,
        submittedAt: seed.survey.submittedAt,
        status: seed.survey.status,
        answers: seed.survey.answers,
      },
    ) ?? {
      completed: false,
      status: "belum-dikumpulkan",
    };

  return {
    phone: mergedPortal.phone,
    pin: mergedPortal.pin ?? null,
    submissionId: seed.applicationId,
    applicant: {
      number: seed.nik,
      name: seed.name,
      birthDate: seed.dob,
      address: formatAddress(seed.region),
      phone: mergedPortal.phone,
      email: mergedPortal.email ?? defaultEmail(seed.name),
    },
    createdAt: seed.createdAt,
    faceMatchPassed: mergedPortal.faceMatchPassed ?? true,
    livenessPassed: mergedPortal.livenessPassed ?? true,
    verificationStatus: mergedPortal.verificationStatus ?? "SEDANG_DITINJAU",
    survey,
  };
};

let cachedAccounts: Account[] | null = null;

export const LocalAuthRepository: AuthRepository = {
  async loadAccounts() {
    if (!cachedAccounts) {
      cachedAccounts = beneficiaries
        .filter((seed) => !!seed.phone && !!seed.applicationId)
        .map(buildAccount);
    }
    return cachedAccounts.map((account) => ({ ...account }));
  },

  async saveAccounts(accounts) {
    cachedAccounts = accounts.map((account) => ({ ...account }));
  },
};
