const SESSION_KEY = "ekyc.session";

export type SessionPayload = {
  token: string;
  phone: string;
  expiresAt: number;
};

function getStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadSession(): SessionPayload | null {
  const storage = getStorage();
  if (!storage) return null;
  const raw = storage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as SessionPayload;
    if (!data?.token || !data?.phone || typeof data.expiresAt !== "number") {
      storage.removeItem(SESSION_KEY);
      return null;
    }
    if (Date.now() > data.expiresAt) {
      storage.removeItem(SESSION_KEY);
      return null;
    }
    return data;
  } catch {
    storage.removeItem(SESSION_KEY);
    return null;
  }
}

export function saveSession(session: SessionPayload) {
  const storage = getStorage();
  storage?.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  const storage = getStorage();
  storage?.removeItem(SESSION_KEY);
}

export function createSession(phone: string): SessionPayload {
  const token =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const expiresAt = Date.now() + 12 * 60 * 60 * 1000; // 12 hours
  const session: SessionPayload = { token, phone, expiresAt };
  saveSession(session);
  return session;
}
