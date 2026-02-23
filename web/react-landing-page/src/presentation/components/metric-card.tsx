import type { ReactNode } from "react";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import { CardShell } from "@/presentation/components/card-shell";
import { cn } from "@/shared/lib/utils";

type MetricCardProps = {
  title: string;
  value: ReactNode;
  description?: string;
  accentClassName?: string;
};

export const MetricCard = ({
  title,
  value,
  description,
  accentClassName,
}: MetricCardProps) => {
  return (
    <CardShell>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {description ? (
          <CardDescription className="text-xs">
            {description}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>
        <div className={cn("text-3xl font-semibold", accentClassName)}>
          {value}
        </div>
      </CardContent>
    </CardShell>
  );
};
