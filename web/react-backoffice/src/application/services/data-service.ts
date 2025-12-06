import type {
  Application,
  Batch,
  Db,
  Distribution,
  Visit,
  VisitStatus,
} from "@domain/types";
import { BackofficeAPI } from "@application/services/api/backoffice";
import { fetchBackofficeSnapshot } from "@application/services/api/backoffice.sync";
import {
  mapApplicationResponse,
  mapVisitResponse,
  toSystemConfigPayload,
} from "@application/services/api/backoffice.mappers";
import { getSession } from "@shared/session";
import { loadDb, saveDb, SHARED_DB_KEY } from "@shared/storage";

let db: Db = loadDb();

function emitChange() {
  try {
    if (typeof window !== "undefined") {
      const evt = new CustomEvent("backoffice:data:changed", {
        detail: Date.now(),
      });
      window.dispatchEvent(evt);
    }
  } catch {}
}

function commit() {
  saveDb(db);
  emitChange();
}

const ensureSession = () => {
  const session = getSession();
  if (!session) {
    throw new Error("Tidak ada sesi aktif");
  }
  return session;
};

type SyncOptions = { sync?: boolean };

const runWithSync = async <T>(
  operation: () => Promise<T>,
  options: SyncOptions = {},
) => {
  const result = await operation();
  if (options.sync !== false) {
    await Data.syncFromServer();
  }
  return result;
};

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === SHARED_DB_KEY) {
      db = loadDb();
      emitChange();
    }
  });
}

export const Data = {
  get: () => db,
  refresh() {
    db = loadDb();
    emitChange();
    return db;
  },
  reset() {
    localStorage.removeItem("backoffice.db.v1");
    db = loadDb();
    emitChange();
    return db;
  },
  async syncFromServer() {
    ensureSession();
    const previous = db;
    const fresh = await fetchBackofficeSnapshot();
    fresh.applications = fresh.applications.map((app) => {
      const existing = previous.applications.find((a) => a.id === app.id);
      if (!existing) return app;
      return {
        ...app,
        documents:
          existing.documents?.length > 0 ? existing.documents : app.documents,
        survey: existing.survey ?? app.survey,
        timeline:
          (existing.timeline?.length ?? 0) > 0
            ? existing.timeline
            : app.timeline,
        visits: app.visits?.length ? app.visits : existing.visits,
      };
    });
    if (fresh.visits.length === 0 && previous.visits.length > 0) {
      fresh.visits = previous.visits;
    }
    db = fresh;
    commit();
    return db;
  },
  // Queries
  listApplications() {
    return db.applications;
  },
  getApplication(id: string) {
    return db.applications.find((a) => a.id === id) || null;
  },
  listUsers() {
    return db.users;
  },
  getConfig() {
    return db.config;
  },
  async setConfig(cfg: Db["config"]) {
    db.config = cfg;
    commit();
    await runWithSync(() =>
      BackofficeAPI.updateConfig(toSystemConfigPayload(cfg)),
    );
  },
  listBatches() {
    return db.batches;
  },
  listClusteringRuns() {
    return db.clusteringRuns;
  },
  listDistributions() {
    return db.distributions;
  },
  getClusteringRun(id: string) {
    return db.clusteringRuns.find((r) => r.id === id) ?? null;
  },
  listVisits() {
    return db.visits;
  },

  async fetchApplication(id: string) {
    ensureSession();
    const res = await BackofficeAPI.getApplication(id);
    const mapped = mapApplicationResponse(res);
    const idx = db.applications.findIndex((app) => app.id === id);
    if (idx >= 0) {
      db.applications[idx] = mapped;
    } else {
      db.applications.push(mapped);
    }
    db.visits = [
      ...db.visits.filter((v) => v.application_id !== id),
      ...mapped.visits,
    ];
    commit();
    return mapped;
  },

  async updateStatus(
    id: string,
    next: Application["status"],
    by: string,
    reason?: string,
  ) {
    await runWithSync(() =>
      BackofficeAPI.updateApplicationStatus(id, {
        status: next,
        actor: by,
        reason,
      }),
    );
  },

  async createVisit(
    appId: string,
    payload: Pick<Visit, "scheduled_at" | "tksk_id">,
    by: string,
    options?: SyncOptions,
  ) {
    const visit = await runWithSync(
      () =>
        BackofficeAPI.createVisit(appId, {
          actor: by,
          scheduledAt: payload.scheduled_at,
          tkskId: payload.tksk_id,
        }),
      options,
    );
    return mapVisitResponse(visit);
  },

  async setVisitStatus(
    appId: string,
    visitId: string,
    status: VisitStatus,
    by: string,
    reason?: string,
  ) {
    await runWithSync(() =>
      BackofficeAPI.updateVisit(appId, visitId, { actor: by, status, reason }),
    );
  },

  async addVisitArtifacts(
    appId: string,
    visitId: string,
    data: Partial<Pick<Visit, "geotag" | "photos" | "checklist">>,
    by: string,
    options?: SyncOptions,
  ) {
    await runWithSync(
      () =>
        BackofficeAPI.updateVisit(appId, visitId, {
          actor: by,
          geotag: data.geotag
            ? { lat: data.geotag.lat, lng: data.geotag.lng }
            : undefined,
          photos: data.photos,
          checklist: data.checklist,
        }),
      options,
    );
  },

  async createBatch(code: string, items: string[], by: string) {
    await runWithSync(() =>
      BackofficeAPI.createBatch({ code, items, actor: by }),
    );
  },

  async setBatchStatus(id: string, status: Batch["status"], by: string) {
    await runWithSync(() =>
      BackofficeAPI.updateBatchStatus(id, { status, actor: by }),
    );
  },

  async createDistribution(
    payload: Pick<
      Distribution,
      | "name"
      | "scheduled_at"
      | "channel"
      | "location"
      | "batch_codes"
      | "beneficiaries"
      | "notes"
    >,
    by: string,
  ) {
    await runWithSync(() =>
      BackofficeAPI.createDistribution({
        actor: by,
        name: payload.name,
        scheduledAt: payload.scheduled_at,
        channel: payload.channel,
        location: payload.location,
        notes: payload.notes,
        batchCodes: payload.batch_codes,
        beneficiaries: payload.beneficiaries,
      }),
    );
  },

  async updateDistributionStatus(
    id: string,
    status: Distribution["status"],
    by: string,
  ) {
    await runWithSync(() =>
      BackofficeAPI.updateDistributionStatus(id, { status, actor: by }),
    );
  },

  async notifyDistribution(id: string, beneficiaries: string[], by: string) {
    if (beneficiaries.length === 0) {
      return;
    }
    await runWithSync(() =>
      BackofficeAPI.notifyDistribution(id, { beneficiaries, actor: by }),
    );
  },
};
