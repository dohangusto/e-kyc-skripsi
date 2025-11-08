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

### Local development

- `BACKOFFICE_HTTP_ADDR` defaults to `:8081` but can be overridden via ConfigMap/env.
- `BACKOFFICE_DB_DSN` defaults to `postgres://postgres:postgres@localhost:5432/ekyc_backoffice?sslmode=disable`. Tilt now provisions a local Postgres (`database-postgres`) reachable via the same DSN when running the dev cluster.
- The PostgreSQL pool is created in `cmd/main.go` and injected into repositories, paving the way for replacing the current seed-based repository with real queries.
