import type { Role } from "@/domain/types";

export const actorBadgeClassMap: Record<Role, string> = {
  VERIFIER: "border-sky-200 bg-sky-50 text-sky-700",
  SUPERVISOR: "border-violet-200 bg-violet-50 text-violet-700",
};

export const defaultAuditBadgeClass =
  "border-slate-200 bg-slate-50 text-slate-700";
