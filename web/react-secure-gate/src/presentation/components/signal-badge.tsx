import { Badge } from "@/presentation/components/ui/badge";
import type { FaceMatch, Restriction } from "@/domain/types";

type SignalBadgeProps =
  | { type: "faceMatch"; value: FaceMatch }
  | { type: "restriction"; value: Restriction };

const faceMatchConfig: Record<FaceMatch, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }>
  = {
    MATCH: { label: "Face Match", variant: "default" },
    MISMATCH: { label: "Face Mismatch", variant: "destructive" },
    PENDING: { label: "Face Pending", variant: "outline" },
  };

const restrictionConfig: Record<Restriction, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }>
  = {
    FULL: { label: "Full Access", variant: "secondary" },
    LIMITED: { label: "Limited", variant: "outline" },
  };

export const SignalBadge = (props: SignalBadgeProps) => {
  const config = props.type === "faceMatch" ? faceMatchConfig[props.value] : restrictionConfig[props.value];
  return <Badge variant={config.variant}>{config.label}</Badge>;
};
