import { UserCircle, Unlock } from "lucide-react";
import { useState } from "react";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { useRole } from "@/presentation/components/role-context";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/presentation/components/ui/sheet";
import { toast } from "sonner";

export const Topbar = () => {
  const {
    isAuthenticated,
    isLocked,
    login,
    logout,
    unlockPage,
    lockPage,
    actorName,
  } = useRole();
  const [loginOpen, setLoginOpen] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [nik, setNik] = useState("");
  const [password, setPassword] = useState("");
  const [lockPassword, setLockPassword] = useState("");
  const [unlockPassword, setUnlockPassword] = useState("");

  const handleLogin = () => {
    const ok = login(nik, password);
    if (!ok) {
      toast.error("Login failed. Check NIK and password.");
      return;
    }
    toast.success(`Welcome back, ${actorName}`);
    setNik("");
    setPassword("");
    setLoginOpen(false);
  };

  const handleUnlock = () => {
    const ok = unlockPage(unlockPassword);
    if (!ok) {
      toast.error("Unlock failed. Invalid password.");
      return;
    }
    toast.success("Page unlocked");
    setUnlockPassword("");
    setUnlockOpen(false);
  };

  const handleLock = () => {
    const ok = lockPage(lockPassword);
    if (!ok) {
      toast.error("Lock failed. Invalid password.");
      return;
    }
    toast.success("Page locked");
    setLockPassword("");
    setLockOpen(false);
  };

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <div className="text-sm font-semibold tracking-tight">
        React Secure Gate
      </div>
      <div className="flex items-center gap-3">
        {isLocked ? (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setUnlockOpen(true)}
          >
            <Unlock className="h-4 w-4" />
            Unlock
          </Button>
        ) : null}
        {isAuthenticated && !isLocked ? (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setLockOpen(true)}
          >
            <Unlock className="h-4 w-4 rotate-180" />
            Lock Page
          </Button>
        ) : null}
        {isAuthenticated ? (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={logout}
          >
            <UserCircle className="h-4 w-4" />
            Logout
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setLoginOpen(true)}
          >
            <UserCircle className="h-4 w-4" />
            Login
          </Button>
        )}
      </div>

      <Sheet open={loginOpen} onOpenChange={setLoginOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Login</SheetTitle>
            <SheetDescription>Enter your NIK and password.</SheetDescription>
          </SheetHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                NIK
              </label>
              <Input
                placeholder="e.g. 1234567890"
                value={nik}
                onChange={(event) => setNik(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Password
              </label>
              <Input
                type="password"
                placeholder="••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Hint: NIK starting with 9 or S will be treated as Supervisor.
            </div>
            <Button onClick={handleLogin} className="w-full">
              Sign in
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={lockOpen} onOpenChange={setLockOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Lock Page</SheetTitle>
            <SheetDescription>
              Enter your password to lock the page.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Password
              </label>
              <Input
                type="password"
                placeholder="••••••"
                value={lockPassword}
                onChange={(event) => setLockPassword(event.target.value)}
              />
            </div>
            <Button onClick={handleLock} className="w-full">
              Lock Page
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={unlockOpen} onOpenChange={setUnlockOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Unlock Page</SheetTitle>
            <SheetDescription>
              Enter your password to continue.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Password
              </label>
              <Input
                type="password"
                placeholder="••••••"
                value={unlockPassword}
                onChange={(event) => setUnlockPassword(event.target.value)}
              />
            </div>
            <Button onClick={handleUnlock} className="w-full" variant="default">
              Unlock
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
};
