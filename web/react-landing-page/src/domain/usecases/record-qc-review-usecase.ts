import type { QCRepository } from "@/data/repositories/qc-repository";
import type { QCVerdict, Role } from "@/domain/types";

export const recordQCReviewUsecase = (
  repo: QCRepository,
  sampleId: string,
  caseId: string,
  payload: { verdict: QCVerdict; notes?: string },
  actor: { role: Role; name: string }
) => {
  return repo.recordReview(sampleId, caseId, payload, actor);
};
