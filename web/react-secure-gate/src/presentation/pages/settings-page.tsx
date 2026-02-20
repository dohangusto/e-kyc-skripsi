import { PageHeader } from "@/presentation/components/page-header";
import { Button } from "@/presentation/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/presentation/components/ui/card";
import { Switch } from "@/presentation/components/ui/switch";
import { useFeatureFlags } from "@/presentation/components/feature-flags-context";

const flagItems: Array<{
  key:
    | "enableManualApprove"
    | "enablePIIReveal"
    | "requireRejectTypingConfirm"
    | "enableBulkTriage"
    | "enableSavedViews";
  title: string;
  description: string;
}> = [
  {
    key: "enableManualApprove",
    title: "Manual Approvals",
    description: "Allow verifiers to approve cases manually.",
  },
  {
    key: "enablePIIReveal",
    title: "PII Reveal",
    description: "Permit gated reveal of sensitive PII fields.",
  },
  {
    key: "requireRejectTypingConfirm",
    title: "Reject Typing Confirmation",
    description: "Require typing REJECT before a rejection is confirmed.",
  },
  {
    key: "enableBulkTriage",
    title: "Bulk Triage",
    description: "Enable multi-select bulk assignment and tagging.",
  },
  {
    key: "enableSavedViews",
    title: "Saved Views",
    description: "Allow saving and switching filter views.",
  },
];

export const SettingsPage = () => {
  const { flags, setFlag, resetDefaults } = useFeatureFlags();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage policy flags for the review experience."
        actions={
          <Button variant="outline" onClick={resetDefaults}>
            Reset to defaults
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Feature Flags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {flagItems.map((item) => (
            <div
              key={item.key}
              className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-muted/50 p-3"
            >
              <div>
                <div className="text-sm font-medium">{item.title}</div>
                <div className="text-xs text-muted-foreground">
                  {item.description}
                </div>
              </div>
              <Switch
                checked={flags[item.key]}
                onCheckedChange={(checked) => setFlag(item.key, checked)}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
