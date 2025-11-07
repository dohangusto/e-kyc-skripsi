# Backoffice (React + TS + Vite)

Sitemap (routes):
- /login, /overview, /applications, /applications/:id, /tksk, /risk, /clustering, /batches, /config, /users, /audit

Fitur utama:
- Seed data lokal (`localStorage`) dari `@dummies/seed.json` & `@dummies/beneficiaries` + generator (`src/shared/mock.ts`)
- Simulasi network `simulateRequest()` untuk aksi (delay + 5% gagal)
- State dan persistensi via `application/services/data-service.ts`
- Komponen UI: `StatusPill`, `ScoreBadge`, `ConfirmModal`, `Toast`, `RoleGate`
- Router ringan tanpa dependency di `src/app/router.ts`
- Clustering console (`/clustering`) untuk trigerring job rekomendasi, assign ke TKSK, dan approval TKSK

Menjalankan:
- cd web/react-backoffice
- npm i
- npm run dev

Catatan TypeScript:
- Jika IDE error `vite/client`, pastikan dependencies sudah di-install dan VS Code memakai Workspace TypeScript.
