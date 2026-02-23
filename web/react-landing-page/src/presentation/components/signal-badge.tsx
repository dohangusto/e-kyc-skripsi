import { Badge } from "@/presentation/components/ui/badge";
import type { FaceMatch, Restriction } from "@/domain/types";

type SignalBadgeProps =
  | { type: "faceMatch"; value: FaceMatch; abbreviated?: boolean }
  | { type: "restriction"; value: Restriction; abbreviated?: boolean };

export const faceMatchLabelMap: Record<FaceMatch, string> = {
  MATCH: "Face Match",
  MISMATCH: "Face Mismatch",
  PENDING: "Face Pending",
};

export const faceMatchAbbreviationMap: Record<FaceMatch, string> = {
  MATCH: "FM",
  MISMATCH: "FMM",
  PENDING: "FP",
};

export const restrictionLabelMap: Record<Restriction, string> = {
  FULL: "Full Access",
  LIMITED: "Limited",
};

export const restrictionAbbreviationMap: Record<Restriction, string> = {
  FULL: "FA",
  LIMITED: "LA",
};

export const faceMatchClassMap: Record<FaceMatch, { className: string }> = {
  MATCH: {
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  MISMATCH: {
    className: "border-red-200 bg-red-50 text-red-700",
  },
  PENDING: {
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
};

export const restrictionClassMap: Record<Restriction, { className: string }> = {
  FULL: {
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  LIMITED: {
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
};

export const SignalBadge = (props: SignalBadgeProps) => {
  const config =
    props.type === "faceMatch"
      ? faceMatchClassMap[props.value]
      : restrictionClassMap[props.value];
  const label =
    props.type === "faceMatch"
      ? faceMatchLabelMap[props.value]
      : restrictionLabelMap[props.value];
  const shortLabel =
    props.type === "faceMatch"
      ? faceMatchAbbreviationMap[props.value]
      : restrictionAbbreviationMap[props.value];
  const abbreviated = props.abbreviated ?? false;

  return (
    <Badge variant="outline" className={config.className} title={label}>
      {abbreviated ? shortLabel : label}
    </Badge>
  );
};
