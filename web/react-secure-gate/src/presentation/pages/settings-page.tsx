import { PageHeader } from "@/presentation/components/page-header";
import { EmptyState } from "@/presentation/components/empty-state";
import { Button } from "@/presentation/components/ui/button";

export const SettingsPage = () => {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage workspace preferences." />
      <EmptyState
        title="Settings coming soon"
        description="Role-based controls and integrations will live here."
        action={<Button disabled>Save Changes</Button>}
      />
    </div>
  );
};
