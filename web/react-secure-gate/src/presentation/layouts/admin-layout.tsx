import { Outlet, useLocation } from "react-router-dom";
import { Lock, LogIn, ShieldCheck, Sparkles } from "lucide-react";
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
            <div className="absolute inset-0 bg-gradient-to-br from-background via-card to-muted" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(37,52,63,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(37,52,63,0.08)_1px,transparent_1px)] bg-[size:32px_32px] opacity-50" />
            <div className="absolute -left-24 top-10 h-80 w-80 rounded-full bg-primary/25 blur-3xl" />
            <div className="absolute right-10 top-24 h-72 w-72 rounded-full bg-secondary/40 blur-3xl" />
            <div className="absolute bottom-16 left-24 h-32 w-32 rounded-[36px] border border-border/60 bg-card/60" />
            <div className="relative z-10 mx-auto flex min-h-[calc(100vh-56px)] w-full max-w-6xl items-center px-6 py-12 lg:px-10">
              <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-4 py-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Secure Gate Admin
                  </div>
                  <div className="space-y-3">
                    <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
                      Akses verifikasi hanya untuk petugas terotorisasi.
                    </h1>
                    <p className="max-w-xl text-sm text-muted-foreground">
                      Masuk ke Secure Gate untuk memproses verifikasi identitas, memantau antrian,
                      dan menjaga kualitas penyaluran bantuan sosial.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    {[
                      { label: "Enkripsi aktif", detail: "End-to-end" },
                      { label: "Audit berjalan", detail: "Setiap keputusan" },
                      { label: "Status sistem", detail: "Siap digunakan" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-2xl border border-border/60 bg-card/80 p-4 text-xs"
                      >
                        <div className="text-muted-foreground">{item.label}</div>
                        <div className="mt-2 text-sm font-semibold text-foreground">
                          {item.detail}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      Autentikasi berbasis NIK
                    </div>
                    <div className="flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-2">
                      <Lock className="h-4 w-4 text-primary" />
                      Kontrol akses ketat
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-3xl border border-border/60 bg-card/80 p-8 shadow-lg backdrop-blur">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                          Portal Akses
                        </p>
                        <h2 className="mt-2 text-2xl font-semibold text-foreground">
                          Siap memulai sesi verifikasi
                        </h2>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                        <LogIn className="h-6 w-6" />
                      </div>
                    </div>
                    <div className="mt-6 space-y-4 text-sm text-muted-foreground">
                      {[
                        "Gunakan tombol Login di kanan atas.",
                        "Masukkan NIK dan password petugas.",
                        "Akses menu akan terbuka setelah autentikasi.",
                      ].map((item, index) => (
                        <div key={item} className="flex items-center gap-3">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                            {index + 1}
                          </span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 flex items-center gap-3 rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-xs text-muted-foreground">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Sistem siap untuk sesi verifikasi berikutnya.
                    </div>
                  </div>
                  <div className="rounded-3xl border border-border/60 bg-card/80 p-6 text-sm text-muted-foreground shadow-lg backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      Catatan Keamanan
                    </p>
                    <p className="mt-3">
                      Jangan bagikan kredensial akses. Semua aktivitas terekam untuk audit internal.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </main>
        )}
        {isAuthenticated && isLocked ? (
          <div className="pointer-events-none absolute inset-y-14 right-0 left-0 flex items-center justify-center">
            <div className="absolute inset-0 bg-foreground/10 backdrop-blur-sm" />
            <div className="relative z-10 w-full max-w-xl rounded-3xl border border-border/70 bg-card/90 px-8 py-8 text-center shadow-lg backdrop-blur">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Lock className="h-7 w-7" />
              </div>
              <div className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Security Mode
              </div>
              <div className="mt-2 text-2xl font-semibold text-foreground">Halaman Terkunci</div>
              <div className="mt-2 text-sm text-muted-foreground">
                Gunakan tombol Unlock di top bar untuk melanjutkan sesi verifikasi.
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Sesi aman", value: "Aktif" },
                  { label: "Akses", value: "Dibatasi" },
                  { label: "Catatan", value: "Tersimpan" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-xs text-muted-foreground"
                  >
                    <div>{item.label}</div>
                    <div className="mt-1 text-sm font-semibold text-foreground">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </SidebarInset>
    </SidebarProvider>
  );
};
