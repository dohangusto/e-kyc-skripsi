import type {
  ClusterResult,
  ClusteringSession,
  ClusteringStatus,
} from "@/shared/types/clustering";

const STORAGE_KEY = "rsg.clustering.sessions";

const safeLoad = (): ClusteringSession[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ClusteringSession[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((session) => ({
      ...session,
      status: session.status ?? "NEED_REVIEW",
    }));
  } catch {
    return [];
  }
};

let sessions: ClusteringSession[] = safeLoad();

const persist = () => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
};

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `cluster-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const clusteringStore = {
  listSessions: () =>
    [...sessions].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
  addSession: (name: string, results: ClusterResult[]) => {
    const session: ClusteringSession = {
      id: createId(),
      name,
      createdAt: new Date().toISOString(),
      results,
      status: "NEED_REVIEW",
    };
    sessions = [session, ...sessions];
    persist();
    return session;
  },
  updateStatus: (id: string, status: ClusteringStatus) => {
    sessions = sessions.map((session) =>
      session.id === id ? { ...session, status } : session,
    );
    persist();
    return sessions.find((session) => session.id === id);
  },
  getSession: (id: string) => sessions.find((session) => session.id === id),
};
