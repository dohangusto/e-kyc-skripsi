import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "@/presentation/components/sidebar";
import { Topbar } from "@/presentation/components/topbar";
import { useRole } from "@/presentation/components/role-context";
import { SidebarInset, SidebarProvider } from "@/presentation/components/ui/sidebar";

export const AdminLayout = () => {
  const { isAuthenticated, isLocked } = useRole();
  const location = useLocation();
  const isHome = location.pathname === "/home";
  const isChat = location.pathname.startsWith("/chat");
  return (
    <SidebarProvider className="bg-muted/40 text-foreground">
      {isAuthenticated ? (
        <div className={isLocked ? "pointer-events-none opacity-50" : undefined}>
          <Sidebar />
        </div>
      ) : null}
      <SidebarInset>
        <Topbar />
        {isAuthenticated ? (
          <main
            className={`flex-1 overflow-auto ${isHome ? "" : isChat ? "px-6 pt-6 pb-0" : "p-6"} ${
              isLocked ? "pointer-events-none opacity-50" : ""
            }`}
          >
            <div
              className={
                isHome
                  ? "flex min-h-full w-full flex-col"
                  : "mx-auto flex w-full max-w-6xl flex-col gap-6"
              }
            >
              <Outlet />
            </div>
          </main>
        ) : (
          <main className="relative flex-1 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-indigo-50" />
            <div className="absolute left-0 top-0 h-full w-1/2">
              <div className="absolute -left-24 top-10 h-80 w-80 rounded-full bg-indigo-300/40 blur-3xl" />
              <div className="absolute left-10 top-32 h-64 w-64 rounded-full bg-rose-300/40 blur-3xl" />
              <div className="absolute left-32 top-4 h-28 w-28 rounded-[36px] bg-indigo-500/20 rotate-12" />
              <div className="absolute left-4 top-52 h-40 w-40 rounded-[48px] bg-fuchsia-500/15 -rotate-12" />
              <div className="absolute left-44 top-56 h-52 w-52 rounded-[64px] bg-purple-500/15 rotate-6" />
            </div>
            <div className="relative z-10 mx-auto flex min-h-[calc(100vh-56px)] w-full max-w-6xl items-center px-10 py-12">
              <div className="grid w-full gap-12 lg:grid-cols-[1.1fr_1fr]">
                <div className="relative hidden lg:block">
                  <div className="absolute left-6 top-2 h-80 w-80 rounded-[80px] bg-white/70 shadow-lg" />
                  <div className="absolute left-20 top-24 h-60 w-60 rounded-[70px] bg-indigo-100/80 shadow-lg" />
                  <div className="absolute left-2 top-40 h-52 w-52 rounded-[60px] bg-fuchsia-100/80 shadow-lg" />
                  <div className="absolute left-24 top-48 h-40 w-40 rounded-[50px] bg-purple-100/80 shadow-lg" />
                </div>
                <div className="space-y-6">
                  <div className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
                    Secure Gate Admin
                  </div>
                  <div className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
                    Welcome
                  </div>
                  <div className="max-w-md text-sm text-muted-foreground">
                    Silakan login untuk mengakses Secure Gate Admin. Semua menu akan terbuka setelah
                    autentikasi berhasil.
                  </div>
                  <div className="space-y-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-indigo-400" />
                      Gunakan tombol Login di kanan atas.
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-rose-400" />
                      Akses dibatasi sampai status login aktif.
                    </div>
                  </div>
                  <div className="h-px w-24 bg-foreground/20" />
                  <div className="text-sm font-medium text-foreground/80">
                    Sistem siap untuk sesi verifikasi berikutnya.
                  </div>
                </div>
              </div>
            </div>
          </main>
        )}
        {isAuthenticated && isLocked ? (
          <div className="pointer-events-none absolute inset-y-14 right-0 left-0 flex items-center justify-center">
            <div className="absolute inset-0 bg-slate-950/5 backdrop-blur-sm" />
            <div className="relative z-10 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-8 py-6 text-center shadow-lg">
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">
                Security Mode
              </div>
              <div className="pt-2 text-xl font-semibold text-amber-900">Page Locked</div>
              <div className="pt-1 text-sm text-amber-900/80">
                Gunakan tombol Unlock di top bar untuk melanjutkan.
              </div>
            </div>
          </div>
        ) : null}
      </SidebarInset>
    </SidebarProvider>
  );
};
