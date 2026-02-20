import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PageHeader } from "@/presentation/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/presentation/components/ui/select";
import { Skeleton } from "@/presentation/components/ui/skeleton";
import { ErrorPanel } from "@/presentation/components/error-panel";
import { analyticsUsecases } from "@/shared/lib/usecases";

const rangeOptions = [
  { label: "Last 1 day", value: "1" },
  { label: "Last 7 days", value: "7" },
  { label: "Last 30 days", value: "30" },
] as const;

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

export const AnalyticsPage = () => {
  const [range, setRange] = useState("7");

  const rangeDates = useMemo(() => {
    const days = Number(range);
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    return {
      dateFrom: fromDate.toISOString(),
      dateTo: toDate.toISOString(),
    };
  }, [range]);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["analytics", rangeDates],
    queryFn: () => analyticsUsecases.getReasonAnalytics(rangeDates),
    placeholderData: keepPreviousData,
  });

  const decisionCounts = data?.decisionCounts ?? {
    approvedManual: 0,
    rejected: 0,
    reverify: 0,
    total: 0,
  };
  const fallbackRate = data?.fallbackRate ?? 0;
  const topRejectReasons = data?.topRejectReasons ?? [];
  const topReverifyReasons = data?.topReverifyReasons ?? [];

  const renderReasons = (items: { reasonCode: string; count: number }[]) => {
    if (items.length === 0) {
      return (
        <div className="text-sm text-muted-foreground">No data yet.</div>
      );
    }
    const maxCount = Math.max(...items.map((item) => item.count), 1);
    return (
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.reasonCode} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">
                {item.reasonCode}
              </span>
              <span className="text-xs text-muted-foreground">
                {item.count}
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: `${(item.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Decision outcomes and reason trends."
        actions={
          <div className="flex items-center gap-2">
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="h-8 w-[160px]">
                <SelectValue placeholder="Range" />
              </SelectTrigger>
              <SelectContent>
                {rangeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {isError ? (
        <ErrorPanel
          title="Unable to load analytics."
          description="Please retry to fetch the latest numbers."
          onRetry={() => refetch()}
        />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle>Total Decisions</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-semibold">
                    {decisionCounts.total}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Approved Manual</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-semibold">
                    {decisionCounts.approvedManual}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Rejected</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-semibold">
                    {decisionCounts.rejected}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Re-Verify</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-semibold">
                    {decisionCounts.reverify}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Fallback Rate</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {isLoading ? (
                  <>
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-2 w-full" />
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-semibold">
                      {formatPercent(fallbackRate)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Share of cases in fallback review among submitted cases.
                      {isFetching ? " Updating..." : ""}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Decision Mix</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                {isLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  <>
                    <div>Approved manual: {decisionCounts.approvedManual}</div>
                    <div>Rejected: {decisionCounts.rejected}</div>
                    <div>Re-verify: {decisionCounts.reverify}</div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top reject reasons</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : (
                  renderReasons(topRejectReasons)
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top re-verification reasons</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : (
                  renderReasons(topReverifyReasons)
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
