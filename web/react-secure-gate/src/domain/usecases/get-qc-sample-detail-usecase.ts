import type { QCRepository } from "@/data/repositories/qc-repository";

export const getQCSampleDetailUsecase = (repo: QCRepository, sampleId: string) => {
  return repo.getSampleById(sampleId);
};
