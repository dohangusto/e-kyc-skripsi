import { Outlet } from "react-router-dom";
import { Sidebar } from "@/presentation/components/sidebar";
import { Topbar } from "@/presentation/components/topbar";

export const AdminLayout = () => {
  return (
    <div className="flex h-screen bg-muted/30 text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
