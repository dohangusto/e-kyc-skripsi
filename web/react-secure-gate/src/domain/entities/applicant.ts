import type { Region } from "@/domain/types";

export type Applicant = {
  id?: string;
  nik: string;
  name: string;
  region: Region;
};
