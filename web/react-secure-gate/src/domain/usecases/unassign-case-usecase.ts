import type { CaseRepository } from "@/data/repositories/case-repository";
import type { Role } from "@/domain/types";

export const unassignCaseUsecase = (
  repo: CaseRepository,
  caseId: string,
  actor: { role: Role; name: string }
) => repo.unassignCase(caseId, actor);
