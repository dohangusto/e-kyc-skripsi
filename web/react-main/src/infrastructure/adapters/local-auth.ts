import type { Account, SurveyState } from "@domain/entities/account";
import type { AuthRepository } from "@domain/repositories/auth-repository";

const AUTH_KEY = "ekyc.accounts";

function getStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export const LocalAuthRepository: AuthRepository = {
  async loadAccounts() {
    const storage = getStorage();
    if (!storage) return [];
    const raw = storage.getItem(AUTH_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as Account[];
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((acc) => acc?.phone && acc?.submissionId)
        .map((acc) => {
          const phone = acc.phone;
          const applicant = acc.applicant ?? {
            number: "",
            name: "",
            birthDate: "",
            address: "",
            phone,
            email: "",
          };
          const survey: SurveyState = acc.survey ?? { completed: false, status: "belum-dikumpulkan" };
          const normalizedSurvey: SurveyState = {
            completed: survey.completed ?? false,
            status: survey.status ?? "belum-dikumpulkan",
            submittedAt: survey.submittedAt,
            answers: survey.answers,
          };
          return {
            ...acc,
            phone,
            applicant: { ...applicant, phone: applicant.phone ?? phone },
            verificationStatus: acc.verificationStatus ?? "SEDANG_DITINJAU",
            faceMatchPassed: acc.faceMatchPassed ?? true,
            livenessPassed: acc.livenessPassed ?? true,
            createdAt: acc.createdAt ?? new Date().toISOString(),
            pin: acc.pin ?? null,
            survey: normalizedSurvey,
          };
        });
    } catch {
      storage.removeItem(AUTH_KEY);
      return [];
    }
  },

  async saveAccounts(accounts) {
    const storage = getStorage();
    if (!storage) return;
    try {
      storage.setItem(AUTH_KEY, JSON.stringify(accounts));
    } catch {
      // ignore quota errors for demo
    }
  },
};
