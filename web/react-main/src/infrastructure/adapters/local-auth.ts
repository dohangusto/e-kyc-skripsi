import type { Account } from "@domain/entities/account";
import type { AuthRepository } from "@domain/repositories/auth-repository";
import { PIN_FLAG } from "@shared/security";

const STORAGE_KEY = "ekyc.portal.accounts";
const DUMMY_PHONES = new Set(
  [
    "08123450001",
    "08123450002",
    "08123450003",
    "08123450004",
    "08123450005",
    "08123450006",
  ].map((phone) => phone.replace(/\D/g, "")),
);

const supportsStorage = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const normalizePhone = (value?: string | null) =>
  value ? value.replace(/\D/g, "") : "";

const cloneSurvey = (survey: Account["survey"]) => {
  if (!survey) return undefined;
  type StoredAnswers = NonNullable<Account["survey"]>["answers"];
  return {
    completed: survey.completed,
    status: survey.status,
    submittedAt: survey.submittedAt,
    answers: survey.answers
      ? (JSON.parse(JSON.stringify(survey.answers)) as StoredAnswers)
      : undefined,
  };
};

const sanitizeApplicant = (applicant: Account["applicant"]) => {
  const { pin: _ignored, ...rest } = applicant;
  return { ...rest };
};

const sanitizeAccount = (account: Account): Account => ({
  ...account,
  pin: account.pin ? PIN_FLAG : null,
  applicant: sanitizeApplicant(account.applicant),
  survey: cloneSurvey(account.survey),
});

const readFromStorage = (): Account[] => {
  if (!supportsStorage()) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((account) => {
      const phone = normalizePhone(account?.phone);
      if (!phone) return true;
      return !DUMMY_PHONES.has(phone);
    });
  } catch (err) {
    console.warn("Failed to parse stored accounts", err);
    return [];
  }
};

const persistToStorage = (accounts: Account[]) => {
  if (!supportsStorage()) {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  } catch (err) {
    console.warn("Failed to persist accounts", err);
  }
};

let cachedAccounts: Account[] | null = null;

export const LocalAuthRepository: AuthRepository = {
  async loadAccounts() {
    if (!cachedAccounts) {
      cachedAccounts = readFromStorage().map((account) =>
        sanitizeAccount(account),
      );
      persistToStorage(cachedAccounts);
    }
    return cachedAccounts.map((account) => sanitizeAccount(account));
  },

  async saveAccounts(accounts) {
    cachedAccounts = accounts.map((account) => sanitizeAccount(account));
    persistToStorage(cachedAccounts);
  },
};
