import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

type SectionHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

export const SectionHeader = ({
  title,
  description,
  actions,
  className,
}: SectionHeaderProps) => {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div>
        <div className="text-base font-semibold">{title}</div>
        {description ? (
          <div className="text-sm text-muted-foreground">{description}</div>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
};
