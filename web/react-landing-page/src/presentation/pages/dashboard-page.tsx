import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/presentation/components/page-header";
import { MetricCard } from "@/presentation/components/metric-card";
import { caseUsecases } from "@/shared/lib/usecases";
import type { CaseStatus } from "@/domain/types";

const isSameDay = (date: Date, other: Date) =>
  date.toDateString() === other.toDateString();

const countByStatus = (
  cases: { status: CaseStatus }[],
  statuses: CaseStatus[],
) => cases.filter((item) => statuses.includes(item.status)).length;

export const DashboardPage = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["cases", "summary"],
    queryFn: () => caseUsecases.listCases({ page: 1, pageSize: 200 }),
  });

  const cases = data?.items ?? [];
  const pendingCount = countByStatus(cases, [
    "EKYC_IN_PROGRESS",
    "EKYC_SUBMITTED",
  ]);
  const fallbackCount = countByStatus(cases, ["FALLBACK_REVIEW"]);
  const approvedTodayCount = cases.filter((item) => {
    if (!["APPROVED_MANUAL", "AUTO_VERIFIED"].includes(item.status))
      return false;
    return isSameDay(new Date(item.updatedAt ?? item.createdAt), new Date());
  }).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Operational snapshot for verification throughput."
      />
      <div className="grid gap-6 md:grid-cols-3">
        <MetricCard
          title="Pending Cases"
          description="Currently waiting for completion"
          value={isLoading ? "-" : pendingCount}
          accentClassName="text-slate-700"
        />
        <MetricCard
          title="Fallback Review"
          description="Needs manual supervision"
          value={isLoading ? "-" : fallbackCount}
          accentClassName="text-amber-700"
        />
        <MetricCard
          title="Approved Today"
          description="Auto + manual approvals"
          value={isLoading ? "-" : approvedTodayCount}
          accentClassName="text-emerald-700"
        />
      </div>
    </div>
  );
};
