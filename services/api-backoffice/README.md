# api-backoffice service

This service powers both the citizen-facing React SPA (`web/react-main`) and the operator-facing backoffice (`web/react-backoffice`). It exposes non-AI endpoints (application data, visits, etc.) while heavier ML/OCR workloads stay in other services.

## Architecture

The layout mirrors `services/api-gateway` and follows a clean layered approach:

```
services/api-backoffice/
├── cmd/                    # Entry points
│   └── main.go             # HTTP server bootstrap
├── internal/
│   ├── domain/             # Interfaces + business contracts
│   ├── service/            # Application use-cases
│   └── infrastructure/     # Framework / IO implementations
│       ├── http/           # HTTP handlers
│       ├── repository/     # Persistence adapters (currently seed backed)
│       └── database/       # Database connectivity helpers
├── pkg/
│   └── types/              # Shared DTOs/models
└── README.md
```

### Data model

The shared Postgres instance contains citizen (beneficiary) records and the resulting submissions:

- `users`: single canonical roster for both backoffice operators (ADMIN/RISK/TKSK/AUDITOR) and beneficiaries (citizens). Stores shared attributes such as NIK, phone, email, hashed PIN, and regional scope. All user IDs are UUIDs so both apps can reference the same entities consistently.
- `beneficiaries`: extends `users` when the role is beneficiary (household size, clustering priority, portal flags).
- `applications` (KYC submissions) reference beneficiaries and keep snapshots of scores, documents, visits, surveys, and timeline events.
- `users`, `batches`, `distributions`, `clustering_runs/candidates`, and `audit_logs` power the management workflows in `react-backoffice`.

Both web apps talk to the same tables, so any approval/visit/notification action performed in the backoffice is visible to the citizen dashboard.

### Local development

- `BACKOFFICE_HTTP_ADDR` defaults to `:8081` but can be overridden via ConfigMap/env.
- `BACKOFFICE_DB_DSN` defaults to `postgres://postgres:postgres@localhost:5432/ekyc_backoffice?sslmode=disable`. Tilt now provisions a local Postgres (`database-postgres`) reachable via the same DSN when running the dev cluster.
- The PostgreSQL pool is created in `cmd/main.go` and injected into repositories, paving the way for replacing the current seed-based repository with real queries.
