import { Badge } from "@/presentation/components/ui/badge";
import type { AuditEvent } from "@/domain/entities/audit-event";

type ActionBadgeProps = {
  action: AuditEvent["action"];
};

const actionConfig: Record<AuditEvent["action"], { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  CASE_VIEWED: { label: "Case viewed", variant: "outline" },
  DECISION_APPROVED_MANUAL: { label: "Approved manually", variant: "default" },
  DECISION_REJECTED: { label: "Rejected", variant: "destructive" },
  DECISION_REQUEST_REVERIFY: { label: "Requested re-verification", variant: "secondary" },
};

export const ActionBadge = ({ action }: ActionBadgeProps) => {
  const config = actionConfig[action];
  return <Badge variant={config.variant}>{config.label}</Badge>;
};
