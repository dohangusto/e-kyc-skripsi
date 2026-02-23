import type { Role } from "@/domain/types";

export const actorBadgeClassMap: Record<Role, string> = {
  VERIFIER: "border-[#FF9B51]/70 bg-[#FF9B51]/20 text-[#25343F]",
  SUPERVISOR: "border-[#25343F]/70 bg-[#25343F]/15 text-[#25343F]",
};

export const defaultAuditBadgeClass = "border-[#BFC9D1]/80 bg-[#EAEFEF]/70 text-[#25343F]";
