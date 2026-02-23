import type { Role } from "@/domain/types";
import type { CasesQueryState } from "@/shared/types/cases-query-state";

export type SavedView = {
  id: string;
  name: string;
  createdAt: string;
  state: CasesQueryState;
  isDefault?: boolean;
};

const keyForRole = (role: Role) => `rsg.savedViews.cases.${role}`;

const loadRaw = (role: Role): SavedView[] => {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(keyForRole(role));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SavedView[];
  } catch {
    return [];
  }
};

const saveRaw = (role: Role, views: SavedView[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(keyForRole(role), JSON.stringify(views));
};

export const loadSavedViews = (role: Role) => loadRaw(role);

export const saveView = (role: Role, view: SavedView) => {
  const views = loadRaw(role);
  const next = view.isDefault
    ? views.map((item) => ({ ...item, isDefault: false }))
    : views;
  saveRaw(role, [view, ...next]);
};

export const updateView = (role: Role, view: SavedView) => {
  const views = loadRaw(role);
  const next = views.map((item) => ({
    ...item,
    isDefault: view.isDefault ? false : item.isDefault,
  }));
  const updated = next.map((item) => (item.id === view.id ? view : item));
  saveRaw(role, updated);
};

export const deleteView = (role: Role, id: string) => {
  const views = loadRaw(role).filter((item) => item.id !== id);
  saveRaw(role, views);
};
