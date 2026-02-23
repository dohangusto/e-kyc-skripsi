import type { QCRepository, CreateSampleParams } from "@/data/repositories/qc-repository";
import type { Role } from "@/domain/types";

export const createQCSampleUsecase = (
  repo: QCRepository,
  params: CreateSampleParams,
  actor: { role: Role; name: string }
) => {
  return repo.createSample(params, actor);
};
