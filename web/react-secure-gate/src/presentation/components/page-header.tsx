import type { ReactNode } from "react";
import { Separator } from "@/presentation/components/ui/separator";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: ReactNode;
};

export const PageHeader = ({ title, description, actions, breadcrumbs }: PageHeaderProps) => {
  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        {breadcrumbs ?? (
          <span>
            Home <span className="mx-1">/</span> {title}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      <Separator />
    </div>
  );
};
