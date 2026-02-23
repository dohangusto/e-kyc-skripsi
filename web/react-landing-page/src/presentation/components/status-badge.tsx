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
    className: "border-red-200 bg-red-50 text-red-700",
  },
  EKYC_IN_PROGRESS: {
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  EKYC_SUBMITTED: {
    className: "border-slate-200 bg-slate-50 text-slate-700",
  },
  AUTO_VERIFIED: {
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  FALLBACK_REVIEW: {
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  APPROVED_MANUAL: {
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  REJECTED: {
    className: "border-red-200 bg-red-50 text-red-700",
  },
  NEED_REVERIFY: {
    className: "border-blue-200 bg-blue-50 text-blue-700",
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
