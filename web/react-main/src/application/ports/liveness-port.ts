import type { LivenessResult } from "@/domain/types";

export interface LivenessPort { check(sample: File): Promise<LivenessResult>; }