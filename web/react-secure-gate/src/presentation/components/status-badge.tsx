import { Badge } from "@/presentation/components/ui/badge";
import type { CaseStatus } from "@/domain/types";

const statusConfig: Record<CaseStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }>
  = {
    ELIGIBILITY_FAILED: { label: "Eligibility Failed", variant: "destructive" },
    EKYC_IN_PROGRESS: { label: "eKYC In Progress", variant: "secondary" },
    EKYC_SUBMITTED: { label: "eKYC Submitted", variant: "secondary" },
    AUTO_VERIFIED: { label: "Auto Verified", variant: "default" },
    FALLBACK_REVIEW: { label: "Fallback Review", variant: "outline" },
    APPROVED_MANUAL: { label: "Approved Manual", variant: "default" },
    REJECTED: { label: "Rejected", variant: "destructive" },
    NEED_REVERIFY: { label: "Need Reverify", variant: "secondary" },
  };

export const StatusBadge = ({ status }: { status: CaseStatus }) => {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
};
