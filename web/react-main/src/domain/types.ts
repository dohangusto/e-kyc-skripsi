export type NationalID = {
  number: string;
  name: string;
  birthDate: string;
  address: string;
};

export type OcrResult = Partial<NationalID> & {
  confidence: number;
  rawText?: string;
};

export type FaceMatchingScore = {
  score: number;
  threshold: number;
};

export type LivenessResult = {
  passed: boolean;
  signal?: string;
};

export type Applicant = NationalID & {
  phone: string;
  email: string;
  pin?: string;
};
