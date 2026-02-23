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
    className: "border-[#BFC9D1]/80 bg-[#EAEFEF] text-[#25343F]",
  },
  MISMATCH: {
    className: "border-[#25343F] bg-[#25343F] text-[#FF9B51]",
  },
  PENDING: {
    className: "border-[#FF9B51]/60 bg-[#FF9B51]/15 text-[#25343F]",
  },
};

export const restrictionClassMap: Record<Restriction, { className: string }> = {
  FULL: {
    className: "border-[#25343F]/40 bg-[#BFC9D1]/35 text-[#25343F]",
  },
  LIMITED: {
    className: "border-[#FF9B51]/70 bg-[#FF9B51]/25 text-[#25343F]",
  },
};

export const SignalBadge = (props: SignalBadgeProps) => {
  const config =
    props.type === "faceMatch" ? faceMatchClassMap[props.value] : restrictionClassMap[props.value];
  const label =
    props.type === "faceMatch" ? faceMatchLabelMap[props.value] : restrictionLabelMap[props.value];
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
