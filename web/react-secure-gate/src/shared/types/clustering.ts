export type ClusterResult = {
  name: string;
  nik: string;
  cluster: "PKH" | "BPNT" | "PBI";
  score: number;
  dependents: number;
};

export type ClusteringStatus =
  | "NEED_REVIEW"
  | "ON_UPDATING"
  | "APPROVED"
  | "REJECTED";

export type ClusteringSession = {
  id: string;
  name: string;
  createdAt: string;
  results: ClusterResult[];
  status: ClusteringStatus;
};
