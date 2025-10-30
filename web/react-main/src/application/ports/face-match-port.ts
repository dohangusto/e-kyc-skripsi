import type { FaceMatchingScore } from "@/domain/types";

export interface FaceMatchPort { compare(ktpImage: File, selfieImage: File): Promise<FaceMatchingScore>; }