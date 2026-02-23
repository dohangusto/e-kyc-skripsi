import { Link } from "react-router-dom";
import { PageHeader } from "@/presentation/components/page-header";
import { EmptyState } from "@/presentation/components/empty-state";
import { Button } from "@/presentation/components/ui/button";

export const NotFoundPage = () => {
  return (
    <div className="space-y-6">
      <PageHeader title="Not found" description="The page you requested does not exist." />
      <EmptyState
        title="Page not found"
        description="Check the URL or return to a safe starting point."
        action={
          <Button asChild>
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        }
      />
    </div>
  );
};
