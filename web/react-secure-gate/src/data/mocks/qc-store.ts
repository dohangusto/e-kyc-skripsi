import type { QCSample } from "@/domain/types";

let qcSamples: QCSample[] = [];

export const listQcSamples = () => [...qcSamples];

export const getQcSample = (id: string) =>
  qcSamples.find((sample) => sample.id === id) ?? null;

export const addQcSample = (sample: QCSample) => {
  qcSamples = [sample, ...qcSamples];
};

export const updateQcSample = (updated: QCSample) => {
  qcSamples = qcSamples.map((sample) =>
    sample.id === updated.id ? updated : sample
  );
};
