import type { ReactNode } from "react";
import { Button } from "@/presentation/components/ui/button";
import { Card } from "@/presentation/components/ui/card";

type ErrorPanelProps = {
  title?: string;
  description?: string;
  actionLabel?: string;
  onRetry?: () => void;
  extra?: ReactNode;
};

export const ErrorPanel = ({
  title = "Unable to load data.",
  description = "Please retry.",
  actionLabel = "Retry",
  onRetry,
  extra,
}: ErrorPanelProps) => {
  return (
    <Card className="space-y-3 p-6">
      <div className="text-sm font-medium">{title}</div>
      <div className="text-sm text-muted-foreground">{description}</div>
      <div className="flex items-center gap-2">
        {onRetry ? <Button onClick={onRetry}>{actionLabel}</Button> : null}
        {extra}
      </div>
    </Card>
  );
};
