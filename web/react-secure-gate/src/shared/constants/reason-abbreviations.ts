export const reasonLabelMap: Record<string, string> = {
  EVIDENCE_STRONG_MANUAL_REVIEW: "Evidence Strong Manual Review",
  FACE_MATCH_SYSTEM_FALSE_NEGATIVE: "Face Match System False Negative",
  FACE_MISMATCH_CONFIRMED: "Face Mismatch Confirmed",
  LIVENESS_FAILED: "Liveness Failed",
  DOCUMENT_TAMPERED: "Document Tampered",
  NOT_ELIGIBLE: "Not Eligible",
  SUSPECTED_FRAUD: "Suspected Fraud",
  BLURRY_DOCUMENT: "Blurry Document",
  POOR_LIGHTING: "Poor Lighting",
  LIVENESS_UNCERTAIN: "Liveness Uncertain",
  DATA_INCONSISTENT_NEED_RECAPTURE: "Data Inconsistent Need Recapture",
  MANUAL_VERIFICATION_REQUIRED: "Manual Verification Required",
  DISPUTE_INVESTIGATION: "Dispute Investigation",
  SUPERVISOR_REQUEST: "Supervisor Request",
  DATA_INCONSISTENCY_CHECK: "Data Inconsistency Check",
};

export const reasonAbbreviationMap: Record<string, string> = {
  EVIDENCE_STRONG_MANUAL_REVIEW: "ESMR",
  FACE_MATCH_SYSTEM_FALSE_NEGATIVE: "FMFN",
  FACE_MISMATCH_CONFIRMED: "FMC",
  LIVENESS_FAILED: "LF",
  DOCUMENT_TAMPERED: "DT",
  NOT_ELIGIBLE: "NE",
  SUSPECTED_FRAUD: "SF",
  BLURRY_DOCUMENT: "BD",
  POOR_LIGHTING: "PL",
  LIVENESS_UNCERTAIN: "LU",
  DATA_INCONSISTENT_NEED_RECAPTURE: "DINC",
  MANUAL_VERIFICATION_REQUIRED: "MVR",
  DISPUTE_INVESTIGATION: "DI",
  SUPERVISOR_REQUEST: "SR",
  DATA_INCONSISTENCY_CHECK: "DIC",
};

export const getReasonLabel = (reasonCode?: string) => {
  if (!reasonCode) return "";
  return reasonLabelMap[reasonCode] ?? reasonCode;
};

export const getReasonAbbreviation = (reasonCode?: string) => {
  if (!reasonCode) return "";
  return reasonAbbreviationMap[reasonCode] ?? reasonCode;
};
