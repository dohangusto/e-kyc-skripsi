import { Badge } from "@/presentation/components/ui/badge";
import type { RiskLevel } from "@/domain/types";

const riskConfig: Record<RiskLevel, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }>
  = {
    LOW: { label: "Low", variant: "secondary" },
    MEDIUM: { label: "Medium", variant: "outline" },
    HIGH: { label: "High", variant: "destructive" },
  };

export const RiskBadge = ({ level }: { level: RiskLevel }) => {
  const config = riskConfig[level];
  return <Badge variant={config.variant}>{config.label}</Badge>;
};
