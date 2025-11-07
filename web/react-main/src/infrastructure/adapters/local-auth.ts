import type { Account, SurveyState } from "@domain/entities/account";
import type { AuthRepository } from "@domain/repositories/auth-repository";
import { beneficiaries } from "@dummies/beneficiaries";
import { loadDb, loadPortalState, saveDb, savePortalState } from "@dummies/storage";
import type { Application, PortalInfo, VerificationStatus } from "@dummies/schema";

const formatAddress = (region: { prov: string; kab: string; kec: string; kel: string }) =>
  `${region.kel}, ${region.kec}, ${region.kab}, ${region.prov}`;

const verificationFromStatus = (status: Application["status"] | undefined): VerificationStatus => {
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
  source?: Application["survey"],
  fallback?: {
    completed: boolean;
    submittedAt?: string;
    status?: SurveyState["status"];
    answers?: SurveyState["answers"];
  }
): SurveyState | undefined => {
  if (source) {
    return {
      completed: source.completed ?? false,
      status: source.status ?? "belum-dikumpulkan",
      submittedAt: source.submitted_at,
      answers: source.answers,
    };
  }

  if (fallback) {
    return {
      completed: fallback.completed ?? false,
      status: fallback.status ?? "belum-dikumpulkan",
      submittedAt: fallback.submittedAt,
      answers: fallback.answers,
    };
  }

  return undefined;
};

const defaultEmail = (name: string) => `${name.toLowerCase().replace(/\s+/g, ".") || "user"}@contoh.id`;

const buildAccount = (
  seed: (typeof beneficiaries)[number],
  application: Application | undefined,
  portal: PortalInfo | undefined
): Account => {
  const mergedPortal: PortalInfo = {
    phone: portal?.phone ?? application?.portal?.phone ?? seed.phone,
    email: portal?.email ?? application?.portal?.email ?? defaultEmail(seed.name),
    pin: portal?.pin ?? application?.portal?.pin ?? null,
    verificationStatus:
      application?.portal?.verificationStatus ??
      portal?.verificationStatus ??
      verificationFromStatus(application?.status ?? seed.status),
    faceMatchPassed:
      application?.portal?.faceMatchPassed ??
      portal?.faceMatchPassed ??
      (application?.scores.face ?? seed.scores.face) >= 0.8,
    livenessPassed:
      application?.portal?.livenessPassed ?? portal?.livenessPassed ?? seed.scores.liveness === "OK",
  };

  const surveyFallback = seed.survey
    ? {
        completed: seed.survey.completed,
        submittedAt: seed.survey.submittedAt,
        status: seed.survey.status,
        answers: seed.survey.answers,
      }
    : undefined;

  const survey = normalizeSurvey(application?.survey, surveyFallback) ?? {
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
    createdAt: application?.created_at ?? seed.createdAt,
    faceMatchPassed: mergedPortal.faceMatchPassed ?? true,
    livenessPassed: mergedPortal.livenessPassed ?? true,
    verificationStatus: mergedPortal.verificationStatus ?? "SEDANG_DITINJAU",
    survey,
  };
};

export const LocalAuthRepository: AuthRepository = {
  async loadAccounts() {
    if (typeof window === "undefined") return [];
    const db = loadDb();
    const portalState = loadPortalState();

    return beneficiaries
      .filter((seed) => !!seed.phone && !!seed.applicationId)
      .map((seed) => {
        const application = db.applications.find((app) => app.id === seed.applicationId);
        const portal = portalState[seed.applicationId];
        return buildAccount(seed, application, portal);
      });
  },

  async saveAccounts(accounts) {
    if (typeof window === "undefined") return;
    const portalState = loadPortalState();
    const db = loadDb();
    const nextPortalState = { ...portalState };
    const accountMap = new Map(accounts.map((acc) => [acc.submissionId, acc]));

    const updatedApplications = db.applications.map((application) => {
      const account = accountMap.get(application.id);
      if (!account) return application;

      const survey: Application["survey"] | undefined = account.survey
        ? {
            completed: account.survey.completed,
            submitted_at: account.survey.submittedAt,
            status: account.survey.status,
            answers: account.survey.answers,
          }
        : undefined;

      const portal: PortalInfo = {
        phone: account.phone,
        email: account.applicant.email,
        pin: account.pin ?? null,
        verificationStatus: account.verificationStatus,
        faceMatchPassed: account.faceMatchPassed,
        livenessPassed: account.livenessPassed,
      };

      nextPortalState[application.id] = portal;

      return {
        ...application,
        portal,
        survey,
      };
    });

    savePortalState(nextPortalState);
    saveDb({ ...db, applications: updatedApplications });
  },
};
