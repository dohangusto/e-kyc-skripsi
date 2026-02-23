import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
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
  Home,
  Sparkles,
  Users,
  MessageSquare,
  ChevronDown,
  Pencil,
  Trash2,
  PlusCircle,
  Eye,
} from "lucide-react";
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
  reasonClassMap,
} from "@/shared/constants/reason-abbreviations";
import {
  actionAbbreviationMap,
  actionClassMap,
  actionLabelMap,
} from "@/presentation/components/action-badge";
import { actorBadgeClassMap } from "@/shared/constants/audit-badges";
import {
  Sidebar as AppSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/presentation/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/presentation/components/ui/dropdown-menu";

const navItems: Array<{
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
  console: "ekyc" | "audit";
}> = [
  {
    label: "Home",
    to: "/home",
    icon: Home,
    roles: ["VERIFIER", "SUPERVISOR"],
    console: "ekyc",
  },
  {
    label: "Dashboard",
    to: "/dashboard",
    icon: LayoutDashboard,
    roles: ["VERIFIER", "SUPERVISOR"],
    console: "ekyc",
  },
  {
    label: "Cases",
    to: "/cases",
    icon: FolderKanban,
    roles: ["VERIFIER"],
    console: "ekyc",
  },
  {
    label: "Reports",
    to: "/reports",
    icon: FileText,
    roles: ["SUPERVISOR"],
    console: "audit",
  },
  {
    label: "Audit",
    to: "/audit",
    icon: ClipboardList,
    roles: ["VERIFIER", "SUPERVISOR"],
    console: "audit",
  },
  {
    label: "Analytics",
    to: "/analytics",
    icon: BarChart3,
    roles: ["VERIFIER", "SUPERVISOR"],
    console: "audit",
  },
  {
    label: "QC",
    to: "/qc",
    icon: ClipboardCheck,
    roles: ["SUPERVISOR"],
    console: "audit",
  },
  {
    label: "Clustering",
    to: "/clustering",
    icon: Sparkles,
    roles: ["VERIFIER"],
    console: "ekyc",
  },
  {
    label: "Candidates",
    to: "/candidates",
    icon: Users,
    roles: ["VERIFIER"],
    console: "ekyc",
  },
  {
    label: "Chat",
    to: "/chat",
    icon: MessageSquare,
    roles: ["VERIFIER"],
    console: "ekyc",
  },
  {
    label: "Settings",
    to: "/settings",
    icon: Settings,
    roles: ["VERIFIER"],
    console: "ekyc",
  },
];

const consoleOptions = [
  {
    id: "ekyc" as const,
    label: "eKYC Console",
    description: "Pemrosesan calon penerima",
    icon: ShieldCheck,
  },
  {
    id: "audit" as const,
    label: "Audit Console",
    description: "Audit aktivitas platform",
    icon: ClipboardList,
  },
] as const;

const CONSOLE_STORAGE_KEY = "rsg.sidebar.console";

const getInitials = (value: string) =>
  value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

export const Sidebar = () => {
  const { role, actorName } = useRole();
  const location = useLocation();
  const [activeConsole, setActiveConsole] = useState<"ekyc" | "audit">(() => {
    if (typeof window === "undefined") {
      return role === "SUPERVISOR" ? "audit" : "ekyc";
    }
    const stored = window.localStorage.getItem(CONSOLE_STORAGE_KEY);
    if (stored === "ekyc" || stored === "audit") {
      return stored;
    }
    return role === "SUPERVISOR" ? "audit" : "ekyc";
  });
  const [casesLegendOpen, setCasesLegendOpen] = useState(true);
  const [auditLegendOpen, setAuditLegendOpen] = useState(true);

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
      className: actorBadgeClassMap.VERIFIER,
    },
    {
      short: "S",
      full: "Supervisor",
      className: actorBadgeClassMap.SUPERVISOR,
    },
  ];
  const actionLegendItems = Object.keys(actionLabelMap).map((action) => ({
    short: actionAbbreviationMap[action as keyof typeof actionLabelMap],
    full: actionLabelMap[action as keyof typeof actionLabelMap],
    className: actionClassMap[action as keyof typeof actionLabelMap],
  }));
  const reasonLegendItems = Object.keys(reasonLabelMap).map((reason) => ({
    short: getReasonAbbreviation(reason),
    full: getReasonLabel(reason),
    className: reasonClassMap[reason],
  }));

  const roleLabel = role === "VERIFIER" ? "Verifier" : "Supervisor";
  const actorInitials = useMemo(() => getInitials(actorName), [actorName]);

  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(`${to}/`);

  const filteredNavItems = useMemo(
    () =>
      navItems.filter(
        (item) =>
          item.roles.includes(role) && (item.console === activeConsole || item.label === "Home")
      ),
    [activeConsole, role]
  );

  const activeConsoleOption =
    consoleOptions.find((option) => option.id === activeConsole) ?? consoleOptions[0];

  const handleConsoleChange = (next: "ekyc" | "audit") => {
    setActiveConsole(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CONSOLE_STORAGE_KEY, next);
    }
  };

  return (
    <AppSidebar>
      <SidebarHeader className="border-b">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left hover:bg-muted/60"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
                SG
              </div>
              <div className="flex-1 leading-tight group-data-[state=collapsed]:sr-only">
                <div className="text-sm font-semibold">Secure Gate Admin</div>
                <div className="text-xs text-muted-foreground">{activeConsoleOption.label}</div>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground group-data-[state=collapsed]:hidden" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" sideOffset={12}>
            <DropdownMenuLabel>Console</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {consoleOptions.map((option) => {
              const Icon = option.icon;
              return (
                <DropdownMenuItem
                  key={option.id}
                  onClick={() => handleConsoleChange(option.id)}
                  className={activeConsole === option.id ? "bg-muted/60" : undefined}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border/60 bg-card/80">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{option.label}</div>
                    <div className="text-xs text-muted-foreground">{option.description}</div>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={isActive(item.to)}>
                      <Link to={item.to}>
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Legends</SidebarGroupLabel>
          <SidebarGroupContent className="group-data-[state=collapsed]:hidden">
            <div>
              <button
                type="button"
                onClick={() => setCasesLegendOpen((prev) => !prev)}
                className="flex w-full items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2 text-[11px] font-semibold uppercase text-muted-foreground"
                aria-expanded={casesLegendOpen}
                aria-controls="legend-cases-table"
              >
                <span className="flex items-center gap-2">
                  <Table2 className="h-3.5 w-3.5" />
                  Cases Table
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${casesLegendOpen ? "rotate-180" : ""}`}
                />
              </button>
              {casesLegendOpen ? (
                <div
                  id="legend-cases-table"
                  className="mt-2 space-y-1 rounded-md border border-border/60 bg-card/80 p-2 text-xs"
                >
                  <LegendPopover label="Status" items={statusLegendItems} />
                  <LegendPopover label="Signals" items={signalLegendItems} />
                  <LegendPopover label="Risk" items={riskLegendItems} />
                </div>
              ) : null}
            </div>
            <div>
              <button
                type="button"
                onClick={() => setAuditLegendOpen((prev) => !prev)}
                className="flex w-full items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2 text-[11px] font-semibold uppercase text-muted-foreground"
                aria-expanded={auditLegendOpen}
                aria-controls="legend-audit-table"
              >
                <span className="flex items-center gap-2">
                  <ListChecks className="h-3.5 w-3.5" />
                  Audit Tables
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${auditLegendOpen ? "rotate-180" : ""}`}
                />
              </button>
              {auditLegendOpen ? (
                <div
                  id="legend-audit-table"
                  className="mt-2 space-y-1 rounded-md border border-border/60 bg-card/80 p-2 text-xs"
                >
                  <LegendPopover label="Actor (level)" items={actorLegendItems} />
                  <LegendPopover label="Action" items={actionLegendItems} />
                  <LegendPopover label="Reason" items={reasonLegendItems} />
                </div>
              ) : null}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t bg-card/95">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="group flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-muted/60"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {actorInitials}
              </div>
              <div className="flex-1 leading-tight group-data-[state=collapsed]:sr-only">
                <div className="text-sm font-semibold text-foreground">{actorName}</div>
                <div className="text-xs text-muted-foreground">{roleLabel}</div>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180 group-data-[state=collapsed]:hidden" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" sideOffset={12}>
            <DropdownMenuLabel className="p-0">
              <div className="flex items-center gap-3 px-2 py-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {actorInitials}
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-semibold text-foreground">{actorName}</div>
                  <div className="text-xs text-muted-foreground">{roleLabel}</div>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Eye className="h-4 w-4" />
              View Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Pencil className="h-4 w-4" />
              Edit Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <PlusCircle className="h-4 w-4" />
              Create Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              <Trash2 className="h-4 w-4" />
              Delete Profile
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </AppSidebar>
  );
};
