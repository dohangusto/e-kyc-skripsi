# Backoffice (React + TS + Vite)

Sitemap (routes):
- /login, /overview, /applications, /applications/:id, /tksk, /risk, /batches, /config, /users, /audit

Fitur utama:
- Seed data lokal (`localStorage`) dari `src/shared/seed.json` + generator (`src/shared/mock.ts`)
- Simulasi network `simulateRequest()` untuk aksi (delay + 5% gagal)
- State dan persistensi via `application/services/data-service.ts`
- Komponen UI: `StatusPill`, `ScoreBadge`, `ConfirmModal`, `Toast`, `RoleGate`
- Router ringan tanpa dependency di `src/app/router.ts`

Menjalankan:
- cd web/react-backoffice
- npm i
- npm run dev

Catatan TypeScript:
- Jika IDE error `vite/client`, pastikan dependencies sudah di-install dan VS Code memakai Workspace TypeScript.
