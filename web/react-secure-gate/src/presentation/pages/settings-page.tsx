import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/presentation/components/page-header";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/presentation/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/presentation/components/ui/dialog";
import { Switch } from "@/presentation/components/ui/switch";
import { useFeatureFlags } from "@/presentation/components/feature-flags-context";

type FlagKey =
  | "enableManualApprove"
  | "enablePIIReveal"
  | "requireRejectTypingConfirm"
  | "enableBulkTriage"
  | "enableSavedViews";

type FlagItem = {
  key: FlagKey;
  title: string;
  description: string;
  helper?: string;
};

const flagSections: Array<{
  id: string;
  title: string;
  items: FlagItem[];
}> = [
  {
    id: "approval-controls",
    title: "Approval Controls",
    items: [
      {
        key: "enableManualApprove",
        title: "Manual Approvals",
        description: "Allow verifiers to approve cases manually.",
      },
      {
        key: "requireRejectTypingConfirm",
        title: "Reject Typing Confirmation",
        description: "Require typing REJECT before a rejection is confirmed.",
      },
    ],
  },
  {
    id: "privacy-access",
    title: "Privacy & Access",
    items: [
      {
        key: "enablePIIReveal",
        title: "PII Reveal",
        description: "Permit gated reveal of sensitive PII fields.",
        helper: "PII = Personally Identifiable Information.",
      },
    ],
  },
  {
    id: "view-preferences",
    title: "Views & Preferences",
    items: [
      {
        key: "enableBulkTriage",
        title: "Bulk Triage",
        description: "Enable multi-select bulk assignment and tagging.",
        helper: "Bulk Triage enables multi-case routing actions.",
      },
      {
        key: "enableSavedViews",
        title: "Saved Views",
        description: "Allow saving and switching filter views.",
      },
    ],
  },
];

export const SettingsPage = () => {
  const { flags, setFlag, resetDefaults } = useFeatureFlags();
  const [resetOpen, setResetOpen] = useState(false);

  const handleToggle = (key: FlagKey, nextValue: boolean, title: string) => {
    setFlag(key, nextValue);
    toast.success(`${title} ${nextValue ? "enabled" : "disabled"}.`);
  };

  const handleReset = () => {
    resetDefaults();
    toast.success("Feature flags reset to defaults.");
    setResetOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage policy flags that shape the reviewer experience."
        actions={
          <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
            <Button
              variant="outline"
              className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 sm:w-auto"
              onClick={() => setResetOpen(true)}
            >
              Reset to defaults
            </Button>
            <span className="text-xs text-muted-foreground sm:max-w-xs sm:text-right">
              Restores every flag in the Feature Flags card to its baseline value.
            </span>
          </div>
        }
      />
      <Card className="w-full max-w-full shadow-md">
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <CardTitle className="text-lg">Feature Flags</CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              Fine-tune review behavior, privacy safeguards, and workflow automation. Changes apply
              immediately to active sessions.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border/70 bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            All changes saved
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-8 sm:gap-10">
          {flagSections.map((section) => (
            <section key={section.id} className="flex w-full max-w-full flex-col gap-3">
              <div className="flex w-full max-w-full flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
                  <span className="text-xs text-muted-foreground">
                    {section.items.length} setting{section.items.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="h-px w-full bg-border/60" />
              </div>
              <div className="flex w-full max-w-full flex-col divide-y divide-border/80">
                {section.items.map((item) => {
                  const isEnabled = flags[item.key];
                  return (
                    <div
                      key={item.key}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isEnabled}
                      data-state={isEnabled ? "enabled" : "disabled"}
                      className="group flex cursor-pointer flex-col gap-3 py-5 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=enabled]:bg-primary/5 data-[state=enabled]:hover:bg-primary/10 sm:flex-row sm:items-center sm:justify-between"
                      onClick={() => handleToggle(item.key, !isEnabled, item.title)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleToggle(item.key, !isEnabled, item.title);
                        }
                      }}
                    >
                      <div className="min-w-0 flex-1 space-y-1 px-2 sm:px-1">
                        <div className="text-sm font-semibold text-foreground">{item.title}</div>
                        <div className="text-[13px] leading-relaxed text-muted-foreground">
                          {item.description}
                        </div>
                        {item.helper ? (
                          <div className="text-[11px] text-muted-foreground/90">
                            {item.helper}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-3 px-2 sm:justify-end sm:px-1">
                        <Badge
                          variant="outline"
                          className={
                            isEnabled
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "border-border/70 bg-muted/50 text-muted-foreground"
                          }
                        >
                          {isEnabled ? "Enabled" : "Disabled"}
                        </Badge>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={(checked) =>
                            handleToggle(item.key, checked, item.title)
                          }
                          onClick={(event) => event.stopPropagation()}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </CardContent>
        <CardFooter className="flex flex-col gap-3 border-t border-border/70 bg-muted/20 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Changes are saved automatically.
          </div>
          <div className="max-w-md text-xs text-muted-foreground">
            Updates will be reflected in real time for active reviewer sessions.
          </div>
        </CardFooter>
      </Card>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset feature flags?</DialogTitle>
            <DialogDescription>
              This will restore every setting in Feature Flags to its default state. Active reviewer
              sessions will update immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReset}>
              Reset to defaults
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
