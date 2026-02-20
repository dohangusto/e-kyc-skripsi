import type { VerificationCase } from "@/domain/entities/verification-case";
import { mockCases } from "@/data/mocks/cases";

let casesStore: VerificationCase[] = [...mockCases];

export const listCaseStore = () => [...casesStore];

export const getCaseFromStore = (id: string) =>
  casesStore.find((item) => item.id === id) ?? null;

export const updateCaseInStore = (updated: VerificationCase) => {
  casesStore = casesStore.map((item) => (item.id === updated.id ? updated : item));
};
