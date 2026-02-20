import { Badge } from "@/presentation/components/ui/badge";
import type { AuditEvent } from "@/domain/entities/audit-event";

type ActionBadgeProps = {
  action: AuditEvent["action"];
};

const actionConfig: Record<
  AuditEvent["action"],
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  CASE_VIEWED: { label: "Case viewed", variant: "outline" },
  DECISION_APPROVED_MANUAL: { label: "Approved manually", variant: "default" },
  DECISION_REJECTED: { label: "Rejected", variant: "destructive" },
  DECISION_REQUEST_REVERIFY: {
    label: "Requested re-verification",
    variant: "secondary",
  },
  PII_REVEALED: { label: "PII revealed", variant: "outline" },
  QC_SAMPLE_CREATED: { label: "QC sample created", variant: "secondary" },
  QC_REVIEW_RECORDED: { label: "QC review recorded", variant: "outline" },
};

export const ActionBadge = ({ action }: ActionBadgeProps) => {
  const config = actionConfig[action];
  return <Badge variant={config.variant}>{config.label}</Badge>;
};
