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
    className: "border-[#BFC9D1]/80 bg-[#EAEFEF] text-[#25343F]",
  },
  MEDIUM: {
    className: "border-[#FF9B51]/70 bg-[#FF9B51]/25 text-[#25343F]",
  },
  HIGH: {
    className: "border-[#25343F] bg-[#25343F] text-[#EAEFEF]",
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
