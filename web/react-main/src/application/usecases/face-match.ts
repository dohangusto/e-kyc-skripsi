import type { FaceMatchPort } from "@application/ports/face-match-port";

export const compareFace = (face: FaceMatchPort) => async (ktpImage: File, selfieImage: File) => face.compare(ktpImage, selfieImage);