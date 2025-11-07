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
│       └── repository/     # Persistence adapters (stubbed for now)
├── pkg/
│   └── types/              # Shared DTOs/models
└── README.md
```

For now the repository is an in-memory stub so we can wire the layers end-to-end. Replace it with a real persistence implementation when ready.
