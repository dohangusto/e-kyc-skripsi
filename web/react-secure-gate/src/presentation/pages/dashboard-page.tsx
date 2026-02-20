import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/presentation/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/presentation/components/ui/card";
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
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Pending Cases</CardTitle>
            <CardDescription>Currently waiting for completion</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">
              {isLoading ? "-" : pendingCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Fallback Review</CardTitle>
            <CardDescription>Needs manual supervision</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">
              {isLoading ? "-" : fallbackCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Approved Today</CardTitle>
            <CardDescription>Auto + manual approvals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">
              {isLoading ? "-" : approvedTodayCount}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
