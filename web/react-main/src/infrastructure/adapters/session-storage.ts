const STORAGE_KEY = "ekyc.portal.session";

type StoredSession = {
  token: string;
  phone: string;
  expiresAt: number;
  userId?: string;
  role?: string;
  regionScope?: string[];
};

const supportsStorage = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const parse = (raw: string | null): StoredSession | null => {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    if (typeof data.token !== "string" || typeof data.phone !== "string") {
      return null;
    }
    const expiresAt = Number(data.expiresAt);
    if (!Number.isFinite(expiresAt)) {
      return null;
    }
    return {
      token: data.token,
      phone: data.phone,
      expiresAt,
      userId: typeof data.userId === "string" ? data.userId : undefined,
      role: typeof data.role === "string" ? data.role : undefined,
      regionScope: Array.isArray(data.regionScope)
        ? data.regionScope.filter((item) => typeof item === "string")
        : undefined,
    };
  } catch {
    return null;
  }
};

const serialize = (session: StoredSession) => {
  return JSON.stringify(session);
};

export const SessionStorage = {
  load(): StoredSession | null {
    if (!supportsStorage()) return null;
    return parse(window.localStorage.getItem(STORAGE_KEY));
  },
  save(session: StoredSession | null) {
    if (!supportsStorage()) return;
    if (!session) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, serialize(session));
  },
  clear() {
    if (!supportsStorage()) return;
    window.localStorage.removeItem(STORAGE_KEY);
  },
};
