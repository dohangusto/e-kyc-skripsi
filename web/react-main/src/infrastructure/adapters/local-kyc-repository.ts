import type { KycProgress, KycRepository } from "@domain/repositories/kyc-repository";

const STORAGE_KEY = "ekyc.progress";

function safeLocalStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export const LocalKycRepository: KycRepository = {
  async loadProgress() {
    const storage = safeLocalStorage();
    if (!storage) return null;
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as KycProgress;
      return parsed?.step ? parsed : null;
    } catch {
      storage.removeItem(STORAGE_KEY);
      return null;
    }
  },

  async saveProgress(progress) {
    const storage = safeLocalStorage();
    if (!storage) return;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // ignore quota errors
    }
  },

  async clearProgress() {
    const storage = safeLocalStorage();
    storage?.removeItem(STORAGE_KEY);
  },
};
