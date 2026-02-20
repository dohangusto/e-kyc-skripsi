# React Secure Gate

Admin UI foundation built with Vite + React + TypeScript, TailwindCSS, shadcn/ui, React Router, TanStack Query, and Zod.

## Install

If you have `pnpm`:

```bash
pnpm install
```

Otherwise:

```bash
npm install
```

## Run

```bash
npm run dev
```

Other scripts:

- `npm run build`
- `npm run preview`
- `npm run lint`
- `npm run format`

## Architecture

Clean architecture (pragmatic) under `src/`:

- `src/domain`: entities, usecases, and core types
- `src/data`: repository interfaces, mocks, and mapping helpers
- `src/presentation`: routes, layouts, pages, and UI components
- `src/shared`: shared utilities, constants, and types

UI pages call usecases, and usecases depend on repository interfaces. A mock repository powers the current demo.

## Role Switching Demo

Use the role switcher in the top bar:

- **Verifier**: Dashboard, Cases, Case Detail, Settings
- **Supervisor**: Dashboard, Reports, Case Detail

Unauthorized routes show a “Not authorized” page with a shortcut back to the dashboard.
