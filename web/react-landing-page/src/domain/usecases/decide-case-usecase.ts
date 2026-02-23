import type { CaseRepository } from "@/data/repositories/case-repository";
import type { DecisionPayload, Role } from "@/domain/types";

export const decideCaseUsecase = (
  repo: CaseRepository,
  caseId: string,
  payload: DecisionPayload,
  actor: { role: Role; name: string },
) => {
  return repo.decideCase(caseId, payload, actor);
};
