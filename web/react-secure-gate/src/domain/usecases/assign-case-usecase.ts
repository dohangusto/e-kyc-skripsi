import type { CaseRepository } from "@/data/repositories/case-repository";
import type { Role } from "@/domain/types";

export const assignCaseUsecase = (
  repo: CaseRepository,
  caseId: string,
  actor: { role: Role; name: string }
) => repo.assignCase(caseId, actor);
