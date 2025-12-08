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
      className={`relative rounded-full px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-white text-[var(--deep-navy)] shadow-md"
          : "text-white/80 hover:text-white hover:bg-white/10"
      }`}
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
            <NavItem
              to="/overview"
              label="Overview"
              active={path.startsWith("/overview")}
            />
            <NavItem
              to="/applications"
              label="Applications"
              active={path.startsWith("/applications")}
            />
            <NavItem
              to="/tksk"
              label="TKSK"
              active={path.startsWith("/tksk")}
            />
            <NavItem
              to="/clustering"
              label="Clustering"
              active={path.startsWith("/clustering")}
            />
            <NavItem
              to="/batches"
              label="Batches"
              active={path.startsWith("/batches")}
            />
            <NavItem
              to="/distribution"
              label="Penyaluran"
              active={path.startsWith("/distribution")}
            />
            <NavItem
              to="/config"
              label="Config"
              active={path.startsWith("/config")}
            />
            <NavItem
              to="/users"
              label="Users"
              active={path.startsWith("/users")}
            />
            <NavItem
              to="/audit"
              label="Audit"
              active={path.startsWith("/audit")}
            />
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
