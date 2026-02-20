import type { CaseStatus, QCSample, QCVerdict, Role } from "@/domain/types";

export type CreateSampleParams = {
  fromDateISO: string;
  toDateISO: string;
  sampleSize: number;
  statuses: CaseStatus[];
};

export type ListSamplesParams = {
  page?: number;
  pageSize?: number;
};

export type ListSamplesResult = {
  items: QCSample[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export interface QCRepository {
  createSample(
    params: CreateSampleParams,
    actor: { role: Role; name: string }
  ): Promise<QCSample>;
  getSampleById(sampleId: string): Promise<QCSample>;
  listSamples(params?: ListSamplesParams): Promise<ListSamplesResult>;
  recordReview(
    sampleId: string,
    caseId: string,
    payload: { verdict: QCVerdict; notes?: string },
    actor: { role: Role; name: string }
  ): Promise<QCSample>;
}
