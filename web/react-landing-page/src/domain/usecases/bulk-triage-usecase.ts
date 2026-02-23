import type { CaseRepository } from "@/data/repositories/case-repository";
import type { Role } from "@/domain/types";

export const bulkTriageUsecase = (
  repo: CaseRepository,
  caseIds: string[],
  action:
    | { type: "ASSIGN_TO_ME" }
    | { type: "UNASSIGN" }
    | { type: "TAG"; tag: "FOLLOW_UP" | "SUSPICIOUS" | null },
  actor: { role: Role; name: string }
) => repo.bulkTriage(caseIds, action, actor);
