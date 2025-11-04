import { useEffect, useMemo, useState } from "react";
import { AppRouter, type Route } from "@app/router";
import { Navbar } from "@presentation/components/Navbar";
import LoginPage from "@presentation/pages/LoginPage";
import OverviewPage from "@presentation/pages/OverviewPage";
import ApplicationsPage from "@presentation/pages/ApplicationsPage";
import ApplicationDetailPage from "@presentation/pages/ApplicationDetailPage";
import TkskPage from "@presentation/pages/TkskPage";
import RiskPage from "@presentation/pages/RiskPage";
import BatchesPage from "@presentation/pages/BatchesPage";
import ConfigPage from "@presentation/pages/ConfigPage";
import UsersPage from "@presentation/pages/UsersPage";
import AuditPage from "@presentation/pages/AuditPage";
import { ToastHost } from "@presentation/components/Toast";
import { getSession } from "@shared/session";

const App = () => {
  const [route, setRoute] = useState<Route>(() => AppRouter.get());
  const session = useMemo(() => getSession(), [route.key]);

  useEffect(() => AppRouter.listen(setRoute), []);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar session={session} />
      <main className="max-w-7xl mx-auto p-4">
        {route.path === "/login" && <LoginPage />}
        {route.path === "/overview" && <OverviewPage />}
        {route.path === "/applications" && <ApplicationsPage />}
        {route.path.startsWith("/applications/") && (
          <ApplicationDetailPage id={route.params.id as string} />
        )}
        {route.path === "/tksk" && <TkskPage />}
        {route.path === "/risk" && <RiskPage />}
        {route.path === "/batches" && <BatchesPage />}
        {route.path === "/config" && <ConfigPage />}
        {route.path === "/users" && <UsersPage />}
        {route.path === "/audit" && <AuditPage />}
        {route.path === "/" && <OverviewPage />}
      </main>
      <ToastHost />
    </div>
  );
};

export default App;
