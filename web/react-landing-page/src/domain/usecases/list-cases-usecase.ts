import type { CaseRepository, ListCasesParams } from "@/data/repositories/case-repository";

export const listCasesUsecase = (repo: CaseRepository, params?: ListCasesParams) => {
  return repo.listCases(params);
};
