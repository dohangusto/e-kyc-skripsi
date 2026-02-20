import type { CaseRepository } from "@/data/repositories/case-repository";
import type { Role } from "@/domain/types";

export const setTriageTagUsecase = (
  repo: CaseRepository,
  caseId: string,
  tag: "FOLLOW_UP" | "SUSPICIOUS" | null,
  actor: { role: Role; name: string }
) => repo.setTriageTag(caseId, tag, actor);
