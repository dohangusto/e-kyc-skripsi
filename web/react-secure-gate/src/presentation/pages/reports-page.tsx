import { PageHeader } from "@/presentation/components/page-header";
import { EmptyState } from "@/presentation/components/empty-state";
import { Button } from "@/presentation/components/ui/button";

export const ReportsPage = () => {
  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Operational and compliance reporting." />
      <EmptyState
        title="No reports yet"
        description="This area will host exportable verification summaries."
        action={<Button disabled>Generate Report</Button>}
      />
    </div>
  );
};
