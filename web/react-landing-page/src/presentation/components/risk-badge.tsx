import { Badge } from "@/presentation/components/ui/badge";
import type { RiskLevel } from "@/domain/types";

export const riskLabelMap: Record<RiskLevel, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export const riskAbbreviationMap: Record<RiskLevel, string> = {
  LOW: "L",
  MEDIUM: "M",
  HIGH: "H",
};

export const riskClassMap: Record<RiskLevel, { className: string }> = {
  LOW: {
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  MEDIUM: {
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  HIGH: {
    className: "border-red-200 bg-red-50 text-red-700",
  },
};

export const RiskBadge = ({
  level,
  abbreviated = false,
}: {
  level: RiskLevel;
  abbreviated?: boolean;
}) => {
  const config = riskClassMap[level];
  const fullLabel = riskLabelMap[level];
  const shortLabel = riskAbbreviationMap[level];
  return (
    <Badge variant="outline" className={config.className} title={fullLabel}>
      {abbreviated ? shortLabel : fullLabel}
    </Badge>
  );
};
