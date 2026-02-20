import type { CaseRepository } from "@/data/repositories/case-repository";

export const getCaseDetailUsecase = (repo: CaseRepository, id: string) => {
  return repo.getCaseById(id);
};
