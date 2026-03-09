import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/presentation/components/page-header";
import { Button } from "@/presentation/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Separator } from "@/presentation/components/ui/separator";
import { useRole } from "@/presentation/components/role-context";

export const ProfilePage = () => {
  const { actorName, role, userNik, logout } = useRole();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const roleLabel = role === "VERIFIER" ? "Verifier" : "Supervisor";
  const actorInitials = actorName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const handleDelete = () => {
    setDeleteOpen(false);
    toast.success("Profile deleted.");
    logout();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description="Review your account details and manage profile actions."
      />

      <Card className="w-full max-w-full">
        <CardHeader className="gap-4">
          <div className="flex w-full max-w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {actorInitials}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-foreground">{actorName}</div>
                <div className="truncate text-xs text-muted-foreground">{roleLabel}</div>
              </div>
            </div>
            <div className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto">
                Edit Profile
              </Button>
            </div>
          </div>
          <CardDescription className="text-sm leading-relaxed">
            This profile is linked to your active verification session.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex w-full max-w-full flex-col gap-6">
          <section className="flex w-full max-w-full flex-col gap-4">
            <div className="flex w-full max-w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base">Account Overview</CardTitle>
                <div className="text-xs text-muted-foreground">
                  Snapshot of your account identifiers.
                </div>
              </div>
            </div>
            <div className="grid w-full max-w-full gap-4 sm:grid-cols-2">
              {[
                { label: "Name", value: actorName },
                { label: "Role", value: roleLabel },
                { label: "NIK", value: userNik ?? "-" },
                { label: "Session Status", value: "Active" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex w-full max-w-full min-w-0 flex-col gap-1 rounded-lg border border-border/60 bg-muted/20 p-3"
                >
                  <div className="text-[11px] font-semibold uppercase text-muted-foreground">
                    {item.label}
                  </div>
                  <div className="truncate text-sm font-semibold text-foreground">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <Separator className="bg-border/70" />

          <section className="flex w-full max-w-full flex-col gap-3">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-destructive">Danger Zone</div>
              <div className="text-xs text-muted-foreground">
                Deleting the profile will sign you out and clear the current session.
              </div>
            </div>
            <div className="flex w-full max-w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-md text-xs text-muted-foreground">
                This action cannot be undone and removes the profile data stored on this device.
              </div>
              <Button
                variant="destructive"
                className="w-full sm:w-auto"
                onClick={() => setDeleteOpen(true)}
              >
                Delete Profile
              </Button>
            </div>
          </section>
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete profile?</DialogTitle>
            <DialogDescription>
              This will remove the current profile session from this device. You will be signed
              out and must log in again to continue.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
