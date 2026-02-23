import type { HTMLAttributes } from "react";
import { Card } from "@/presentation/components/ui/card";
import { cn } from "@/shared/lib/utils";

type CardShellProps = HTMLAttributes<HTMLDivElement>;

export const CardShell = ({ className, ...props }: CardShellProps) => {
  return <Card className={cn("shadow-sm", className)} {...props} />;
};
