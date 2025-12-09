import { useMemo } from "react";
import { Data } from "@application/services/data-service";
import { useDataSnapshot } from "@application/services/useDataSnapshot";
import { AppRouter } from "@app/router";
import { setSession, type Session } from "@shared/session";

function NavItem({
  to,
  label,
  active,
}: {
  to: string;
  label: string;
  active: boolean;
}) {
  return (
    <button
      onClick={() => AppRouter.navigate(to)}
      className={`relative text-sm font-semibold transition nav-btn ${active ? "nav-btn--active" : ""}`}
    >
      {label}
      {active && (
        <span className="absolute inset-x-3 -bottom-[6px] h-1 rounded-full bg-[var(--accent-emerald)]" />
      )}
    </button>
  );
}

export function Navbar({ session }: { session: Session | null }) {
  const snapshot = useDataSnapshot();
  const currentUser = session
    ? snapshot.users.find((user) => user.id === session.userId)
    : null;
  const displayName = currentUser?.name ?? session?.userId ?? "Pengguna";
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  const role = session?.role ?? "GUEST";

  const visibleLinks = useMemo(() => {
    if (role === "ADMIN") {
      return [
        { to: "/overview", label: "Overview" },
        { to: "/applications", label: "Applications" },
        { to: "/clustering", label: "Clustering" },
        { to: "/batches", label: "Batches" },
        { to: "/distribution", label: "Penyaluran" },
        { to: "/config", label: "Config" },
      ];
    }
    if (role === "TKSK") {
      return [
        { to: "/overview", label: "Overview" },
        { to: "/applications", label: "Applications" },
        { to: "/tksk", label: "TKSK" },
      ];
    }
    // AUDITOR or other roles see all
    return [
      { to: "/overview", label: "Overview" },
      { to: "/applications", label: "Applications" },
      { to: "/tksk", label: "TKSK" },
      { to: "/clustering", label: "Clustering" },
      { to: "/batches", label: "Batches" },
      { to: "/distribution", label: "Penyaluran" },
      { to: "/config", label: "Config" },
      { to: "/users", label: "Users" },
      { to: "/audit", label: "Audit" },
    ];
  }, [role]);

  return (
    <header className="bg-[var(--deep-navy)] text-white shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 backdrop-blur border border-white/10 shadow-sm">
            <span className="text-lg font-bold tracking-tight">Backoffice</span>
            <span className="rounded-full bg-[var(--accent-emerald)] text-[var(--accent-foreground)] text-[11px] font-semibold px-2 py-0.5">
              ADMIN
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {visibleLinks.map((link) => (
              <NavItem
                key={link.to}
                to={link.to}
                label={link.label}
                active={path.startsWith(link.to)}
              />
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {session ? (
            <>
              <div className="hidden sm:flex flex-col text-right leading-tight">
                <span className="font-semibold">{displayName}</span>
                <span className="text-xs text-blue-100">
                  {session.role} · {session.regionScope.join(",")}
                </span>
              </div>
              <button
                className="nav-cta rounded-full px-3 py-1 text-sm font-semibold transition"
                onClick={() => {
                  setSession(null);
                  Data.reset();
                  AppRouter.navigate("/login");
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <button
              className="nav-cta rounded-full px-3 py-1 text-sm font-semibold transition"
              onClick={() => AppRouter.navigate("/login")}
            >
              Login
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
