import { Link } from "react-router-dom";
import { PageHeader } from "@/presentation/components/page-header";
import { EmptyState } from "@/presentation/components/empty-state";
import { Button } from "@/presentation/components/ui/button";

export const NotAuthorizedPage = () => {
  return (
    <div className="space-y-6">
      <PageHeader title="Not authorized" description="You do not have access to this area." />
      <EmptyState
        title="Access restricted"
        description="Switch roles or return to a permitted section."
        action={
          <Button asChild>
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        }
      />
    </div>
  );
};
