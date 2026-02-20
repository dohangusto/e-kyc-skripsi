import { Navigate } from "react-router-dom";
import { AdminLayout } from "@/presentation/layouts/admin-layout";
import { DashboardPage } from "@/presentation/pages/dashboard-page";
import { CasesPage } from "@/presentation/pages/cases-page";
import { CaseDetailPage } from "@/presentation/pages/case-detail-page";
import { ReportsPage } from "@/presentation/pages/reports-page";
import { SettingsPage } from "@/presentation/pages/settings-page";
import { NotAuthorizedPage } from "@/presentation/pages/not-authorized-page";
import { RoleGuard } from "@/presentation/routes/role-guard";
import { AuditPage } from "@/presentation/pages/audit-page";

export const routes = [
  {
    path: "/",
    element: <AdminLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      {
        path: "dashboard",
        element: (
          <RoleGuard allow={["VERIFIER", "SUPERVISOR"]}>
            <DashboardPage />
          </RoleGuard>
        ),
      },
      {
        path: "cases",
        element: (
          <RoleGuard allow={["VERIFIER"]}>
            <CasesPage />
          </RoleGuard>
        ),
      },
      {
        path: "cases/:id",
        element: (
          <RoleGuard allow={["VERIFIER", "SUPERVISOR"]}>
            <CaseDetailPage />
          </RoleGuard>
        ),
      },
      {
        path: "reports",
        element: (
          <RoleGuard allow={["SUPERVISOR"]}>
            <ReportsPage />
          </RoleGuard>
        ),
      },
      {
        path: "audit",
        element: (
          <RoleGuard allow={["VERIFIER", "SUPERVISOR"]}>
            <AuditPage />
          </RoleGuard>
        ),
      },
      {
        path: "settings",
        element: (
          <RoleGuard allow={["VERIFIER"]}>
            <SettingsPage />
          </RoleGuard>
        ),
      },
      { path: "unauthorized", element: <NotAuthorizedPage /> },
    ],
  },
];
