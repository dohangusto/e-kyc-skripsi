import type { CaseRepository } from "@/data/repositories/case-repository";
import { mockCaseRepository } from "@/data/repositories/mock/case-repository.mock";

export const caseRepository: CaseRepository = mockCaseRepository;
