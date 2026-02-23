import { Badge } from "@/presentation/components/ui/badge";
import type { CaseStatus } from "@/domain/types";

export const statusLabelMap: Record<CaseStatus, string> = {
  ELIGIBILITY_FAILED: "Eligibility Failed",
  EKYC_IN_PROGRESS: "eKYC In Progress",
  EKYC_SUBMITTED: "eKYC Submitted",
  AUTO_VERIFIED: "Auto Verified",
  FALLBACK_REVIEW: "Fallback Review",
  APPROVED_MANUAL: "Approved Manual",
  REJECTED: "Rejected",
  NEED_REVERIFY: "Need Reverify",
};

export const statusAbbreviationMap: Record<CaseStatus, string> = {
  ELIGIBILITY_FAILED: "EF",
  EKYC_IN_PROGRESS: "EIP",
  EKYC_SUBMITTED: "ES",
  AUTO_VERIFIED: "AV",
  FALLBACK_REVIEW: "FR",
  APPROVED_MANUAL: "AM",
  REJECTED: "RJ",
  NEED_REVERIFY: "NR",
};

export const statusClassMap: Record<CaseStatus, { className: string }> = {
  ELIGIBILITY_FAILED: {
    className: "border-[#FF9B51]/80 bg-[#25343F] text-[#EAEFEF]",
  },
  EKYC_IN_PROGRESS: {
    className: "border-[#FF9B51]/70 bg-[#FF9B51]/20 text-[#25343F]",
  },
  EKYC_SUBMITTED: {
    className: "border-[#BFC9D1]/90 bg-[#EAEFEF] text-[#25343F]",
  },
  AUTO_VERIFIED: {
    className: "border-[#25343F]/50 bg-[#BFC9D1]/35 text-[#25343F]",
  },
  FALLBACK_REVIEW: {
    className: "border-[#FF9B51]/75 bg-[#FF9B51]/35 text-[#25343F]",
  },
  APPROVED_MANUAL: {
    className: "border-[#25343F]/70 bg-[#EAEFEF]/70 text-[#FF9B51]",
  },
  REJECTED: {
    className: "border-[#25343F] bg-[#25343F] text-[#FF9B51]",
  },
  NEED_REVERIFY: {
    className: "border-[#25343F]/30 bg-[#25343F]/10 text-[#25343F]",
  },
};

export const StatusBadge = ({
  status,
  abbreviated = false,
}: {
  status: CaseStatus;
  abbreviated?: boolean;
}) => {
  const config = statusClassMap[status];
  const fullLabel = statusLabelMap[status];
  const shortLabel = statusAbbreviationMap[status];
  return (
    <Badge variant="outline" className={config.className} title={fullLabel}>
      {abbreviated ? shortLabel : fullLabel}
    </Badge>
  );
};
