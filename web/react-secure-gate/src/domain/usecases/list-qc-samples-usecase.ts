import type { QCRepository, ListSamplesParams } from "@/data/repositories/qc-repository";

export const listQCSamplesUsecase = (repo: QCRepository, params?: ListSamplesParams) => {
  return repo.listSamples(params);
};
