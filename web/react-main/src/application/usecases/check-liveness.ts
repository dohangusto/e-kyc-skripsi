import type { LivenessPort } from "@application/ports/liveness-port";

export const checkLiveness = (live: LivenessPort) => async (sample: File) => live.check(sample);