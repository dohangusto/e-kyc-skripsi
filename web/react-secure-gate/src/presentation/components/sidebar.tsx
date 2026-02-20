import { NavLink } from "react-router-dom";
import { LayoutDashboard, FolderKanban, FileText, Settings } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useRole } from "@/presentation/components/role-context";
import type { Role } from "@/domain/types";

const navItems: Array<{
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
}> = [
  {
    label: "Dashboard",
    to: "/dashboard",
    icon: LayoutDashboard,
    roles: ["VERIFIER", "SUPERVISOR"],
  },
  {
    label: "Cases",
    to: "/cases",
    icon: FolderKanban,
    roles: ["VERIFIER"],
  },
  {
    label: "Reports",
    to: "/reports",
    icon: FileText,
    roles: ["SUPERVISOR"],
  },
  {
    label: "Settings",
    to: "/settings",
    icon: Settings,
    roles: ["VERIFIER"],
  },
];

export const Sidebar = () => {
  const { role } = useRole();

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-14 items-center border-b px-6 text-sm font-semibold">
        Secure Gate Admin
      </div>
      <nav className="flex-1 space-y-1 p-4 text-sm">
        {navItems
          .filter((item) => item.roles.includes(role))
          .map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-muted",
                    isActive && "bg-muted text-foreground"
                  )
                }
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
      </nav>
      <div className="border-t p-4 text-xs text-muted-foreground">
        Role-based demo navigation
      </div>
    </aside>
  );
};
