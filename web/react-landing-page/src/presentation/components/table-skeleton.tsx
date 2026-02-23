import { Skeleton } from "@/presentation/components/ui/skeleton";
import { Card } from "@/presentation/components/ui/card";

type TableSkeletonProps = {
  rows?: number;
};

export const TableSkeleton = ({ rows = 6 }: TableSkeletonProps) => {
  return (
    <Card className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </Card>
  );
};
