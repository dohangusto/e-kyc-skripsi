import { useEffect, useMemo, useState } from "react";
import { AppRouter, type Route } from "@app/router";
import { AuthAPI } from "@application/services/api";
import { Data } from "@application/services/data-service";
import { Navbar } from "@presentation/components/Navbar";
import LoginPage from "@presentation/pages/LoginPage";
import OverviewPage from "@presentation/pages/OverviewPage";
import ApplicationsPage from "@presentation/pages/ApplicationsPage";
import ApplicationDetailPage from "@presentation/pages/ApplicationDetailPage";
import TkskPage from "@presentation/pages/TkskPage";
import BatchesPage from "@presentation/pages/BatchesPage";
import ConfigPage from "@presentation/pages/ConfigPage";
import UsersPage from "@presentation/pages/UsersPage";
import AuditPage from "@presentation/pages/AuditPage";
import ClusteringPage from "@presentation/pages/ClusteringPage";
import DistributionPage from "@presentation/pages/DistributionPage";
import { ToastHost } from "@presentation/components/Toast";
import { getSession, setSession } from "@shared/session";

const App = () => {
  const [route, setRoute] = useState<Route>(() => AppRouter.get());
  const session = useMemo(() => getSession(), [route.key]);

  useEffect(() => AppRouter.listen(setRoute), []);
  useEffect(() => {
    if (!session?.token) return;
    let cancelled = false;
    const initialize = async () => {
      try {
        await AuthAPI.me(session.token);
        if (!cancelled) {
          await Data.syncFromServer();
        }
      } catch (err) {
        console.error("sync failed", err);
        setSession(null);
        AppRouter.navigate("/login");
      }
    };
    initialize();
    return () => {
      cancelled = true;
    };
  }, [session?.token]);

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
        {route.path === "/clustering" && <ClusteringPage />}
        {route.path === "/distribution" && <DistributionPage />}
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
