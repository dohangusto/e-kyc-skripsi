import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  Settings,
  ClipboardList,
  ClipboardCheck,
  BarChart3,
  ShieldCheck,
  Table2,
  ListChecks,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useRole } from "@/presentation/components/role-context";
import type { Role } from "@/domain/types";
import { LegendPopover } from "@/presentation/components/legend-popover";
import {
  statusAbbreviationMap,
  statusClassMap,
  statusLabelMap,
} from "@/presentation/components/status-badge";
import {
  faceMatchAbbreviationMap,
  faceMatchClassMap,
  faceMatchLabelMap,
  restrictionAbbreviationMap,
  restrictionClassMap,
  restrictionLabelMap,
} from "@/presentation/components/signal-badge";
import {
  riskAbbreviationMap,
  riskClassMap,
  riskLabelMap,
} from "@/presentation/components/risk-badge";
import {
  getReasonAbbreviation,
  getReasonLabel,
  reasonLabelMap,
} from "@/shared/constants/reason-abbreviations";

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
    label: "Audit",
    to: "/audit",
    icon: ClipboardList,
    roles: ["VERIFIER", "SUPERVISOR"],
  },
  {
    label: "Analytics",
    to: "/analytics",
    icon: BarChart3,
    roles: ["VERIFIER", "SUPERVISOR"],
  },
  {
    label: "QC",
    to: "/qc",
    icon: ClipboardCheck,
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
  const statusLegendItems = Object.keys(statusLabelMap).map((status) => ({
    short: statusAbbreviationMap[status as keyof typeof statusLabelMap],
    full: statusLabelMap[status as keyof typeof statusLabelMap],
    className: statusClassMap[status as keyof typeof statusLabelMap]?.className,
  }));
  const signalLegendItems = [
    {
      short: faceMatchAbbreviationMap.MATCH,
      full: faceMatchLabelMap.MATCH,
      className: faceMatchClassMap.MATCH.className,
    },
    {
      short: faceMatchAbbreviationMap.MISMATCH,
      full: faceMatchLabelMap.MISMATCH,
      className: faceMatchClassMap.MISMATCH.className,
    },
    {
      short: faceMatchAbbreviationMap.PENDING,
      full: faceMatchLabelMap.PENDING,
      className: faceMatchClassMap.PENDING.className,
    },
    {
      short: restrictionAbbreviationMap.FULL,
      full: restrictionLabelMap.FULL,
      className: restrictionClassMap.FULL.className,
    },
    {
      short: restrictionAbbreviationMap.LIMITED,
      full: restrictionLabelMap.LIMITED,
      className: restrictionClassMap.LIMITED.className,
    },
  ];
  const riskLegendItems = Object.keys(riskLabelMap).map((risk) => ({
    short: riskAbbreviationMap[risk as keyof typeof riskLabelMap],
    full: riskLabelMap[risk as keyof typeof riskLabelMap],
    className: riskClassMap[risk as keyof typeof riskLabelMap]?.className,
  }));
  const actorLegendItems = [
    {
      short: "V",
      full: "Verifier",
      className: "border-slate-200 bg-slate-50 text-slate-700",
    },
    {
      short: "S",
      full: "Supervisor",
      className: "border-slate-200 bg-slate-50 text-slate-700",
    },
  ];
  const reasonLegendItems = Object.keys(reasonLabelMap).map((reason) => ({
    short: getReasonAbbreviation(reason),
    full: getReasonLabel(reason),
    className: "border-slate-200 bg-slate-50 text-slate-700",
  }));

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
                    "flex items-center gap-2 rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground",
                    isActive &&
                      "border-l-2 border-primary bg-primary/10 pl-2 text-primary font-medium",
                  )
                }
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
      </nav>
      <div className="border-t">
        <div className="flex h-12 items-center gap-2 px-6 text-sm font-semibold text-foreground">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          Legends
        </div>
        <div className="space-y-4 px-4 pb-4 text-xs">
          <div>
            <div className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2 text-[11px] font-semibold uppercase text-muted-foreground">
              <Table2 className="h-3.5 w-3.5" />
              Cases Table
            </div>
            <div className="mt-2 space-y-1 rounded-md border border-border/60 bg-card/80 p-2">
              <LegendPopover label="Status" items={statusLegendItems} />
              <LegendPopover label="Signals" items={signalLegendItems} />
              <LegendPopover label="Risk" items={riskLegendItems} />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2 text-[11px] font-semibold uppercase text-muted-foreground">
              <ListChecks className="h-3.5 w-3.5" />
              Audit Tables
            </div>
            <div className="mt-2 space-y-1 rounded-md border border-border/60 bg-card/80 p-2">
              <LegendPopover label="Actor (level)" items={actorLegendItems} />
              <LegendPopover label="Reason" items={reasonLegendItems} />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
