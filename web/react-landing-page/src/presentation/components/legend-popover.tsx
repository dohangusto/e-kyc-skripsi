import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/presentation/components/ui/dropdown-menu";
import { Badge } from "@/presentation/components/ui/badge";
import { cn } from "@/shared/lib/utils";

type LegendItem = {
  short: string;
  full: string;
  className?: string;
};

type LegendPopoverProps = {
  label: string;
  items: LegendItem[];
  className?: string;
};

export const LegendPopover = ({
  label,
  items,
  className,
}: LegendPopoverProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full rounded-md px-3 py-2 text-left text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            className,
          )}
        >
          {label}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {items.map((item) => (
          <DropdownMenuItem
            key={`${label}-${item.short}`}
            className="flex items-center gap-3"
          >
            <Badge
              variant="outline"
              className={cn("min-w-[48px] justify-center", item.className)}
            >
              {item.short}
            </Badge>
            <span className="text-xs text-muted-foreground">{item.full}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
