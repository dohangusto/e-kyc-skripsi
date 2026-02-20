import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PageHeader } from "@/presentation/components/page-header";
import { EmptyState } from "@/presentation/components/empty-state";
import { StatusBadge } from "@/presentation/components/status-badge";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import { caseUsecases } from "@/shared/lib/usecases";

export const CasesPage = () => {
  const { data: cases = [], isLoading, refetch } = useQuery({
    queryKey: ["cases", "list"],
    queryFn: () => caseUsecases.listCases(),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cases"
        description="Review and action verification cases."
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Refresh
          </Button>
        }
      />
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading cases...</div>
      ) : cases.length === 0 ? (
        <EmptyState
          title="No cases queued"
          description="When new applicants enter the pipeline, they will appear here."
          action={<Button onClick={() => refetch()}>Refresh</Button>}
        />
      ) : (
        <div className="grid gap-4">
          {cases.map((item) => (
            <Card key={item.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">{item.applicant.fullName}</CardTitle>
                  <CardDescription>{item.id}</CardDescription>
                </div>
                <StatusBadge status={item.status} />
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground">
                  National ID: {item.applicant.nationalId}
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to={`/cases/${item.id}`}>Open Case</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
