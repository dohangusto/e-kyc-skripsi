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

export const reasonClassMap: Record<string, string> = {
  EVIDENCE_STRONG_MANUAL_REVIEW: "border-[#FF9B51]/70 bg-[#FF9B51]/20 text-[#25343F]",
  FACE_MATCH_SYSTEM_FALSE_NEGATIVE: "border-[#BFC9D1]/80 bg-[#EAEFEF] text-[#25343F]",
  FACE_MISMATCH_CONFIRMED: "border-[#25343F] bg-[#25343F] text-[#FF9B51]",
  LIVENESS_FAILED: "border-[#25343F]/70 bg-[#25343F]/15 text-[#25343F]",
  DOCUMENT_TAMPERED: "border-[#FF9B51]/80 bg-[#25343F]/10 text-[#FF9B51]",
  NOT_ELIGIBLE: "border-[#25343F]/60 bg-[#EAEFEF]/70 text-[#25343F]",
  SUSPECTED_FRAUD: "border-[#25343F] bg-[#25343F] text-[#EAEFEF]",
  BLURRY_DOCUMENT: "border-[#BFC9D1]/70 bg-[#BFC9D1]/30 text-[#25343F]",
  POOR_LIGHTING: "border-[#FF9B51]/50 bg-[#EAEFEF]/80 text-[#FF9B51]",
  LIVENESS_UNCERTAIN: "border-[#FF9B51]/60 bg-[#FF9B51]/10 text-[#25343F]",
  DATA_INCONSISTENT_NEED_RECAPTURE: "border-[#25343F]/40 bg-[#EAEFEF]/90 text-[#25343F]",
  MANUAL_VERIFICATION_REQUIRED:
    "border-[#FF9B51]/70 bg-[linear-gradient(135deg,rgba(255,155,81,0.25),rgba(234,239,239,0.8))] text-[#25343F]",
  DISPUTE_INVESTIGATION: "border-[#25343F]/60 bg-[#BFC9D1]/20 text-[#25343F]",
  SUPERVISOR_REQUEST: "border-[#FF9B51]/70 bg-[#BFC9D1]/35 text-[#25343F]",
  DATA_INCONSISTENCY_CHECK: "border-[#BFC9D1]/60 bg-[#EAEFEF]/60 text-[#25343F]",
};

export const getReasonLabel = (reasonCode?: string) => {
  if (!reasonCode) return "";
  return reasonLabelMap[reasonCode] ?? reasonCode;
};

export const getReasonAbbreviation = (reasonCode?: string) => {
  if (!reasonCode) return "";
  return reasonAbbreviationMap[reasonCode] ?? reasonCode;
};

export const getReasonClass = (reasonCode?: string) => {
  if (!reasonCode) return "border-[#BFC9D1]/80 bg-[#EAEFEF]/70 text-[#25343F]";
  return reasonClassMap[reasonCode] ?? "border-[#BFC9D1]/80 bg-[#EAEFEF]/70 text-[#25343F]";
};
