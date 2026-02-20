import type { DecisionType } from "@/domain/types";

export const decisionReasons: Record<DecisionType, { value: string; label: string }[]> = {
  APPROVE_MANUAL: [
    { value: "EVIDENCE_STRONG_MANUAL_REVIEW", label: "Evidence strong after manual review" },
    { value: "FACE_MATCH_SYSTEM_FALSE_NEGATIVE", label: "Face match system false negative" },
    { value: "LIVENESS_PASS_CONFIRMED", label: "Liveness passed on review" },
  ],
  REJECT: [
    { value: "FACE_MISMATCH_CONFIRMED", label: "Face mismatch confirmed" },
    { value: "LIVENESS_FAILED", label: "Liveness failed" },
    { value: "DOCUMENT_TAMPERED", label: "Document tampered" },
    { value: "NOT_ELIGIBLE", label: "Not eligible" },
    { value: "SUSPECTED_FRAUD", label: "Suspected fraud" },
  ],
  REQUEST_REVERIFY: [
    { value: "BLURRY_DOCUMENT", label: "Blurry document" },
    { value: "POOR_LIGHTING", label: "Poor lighting" },
    { value: "LIVENESS_UNCERTAIN", label: "Liveness uncertain" },
    { value: "DATA_INCONSISTENT_NEED_RECAPTURE", label: "Data inconsistent, need recapture" },
  ],
};
