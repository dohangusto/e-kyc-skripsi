import { Skeleton } from "@/presentation/components/ui/skeleton";

export const DetailSkeleton = () => {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
};
