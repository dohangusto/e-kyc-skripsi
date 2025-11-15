# api-AI-support (PYTHON - http -gRPC (consumer))

This service handles all api-AI-support-related operations in the system, including e-KYC OCR, face
matching, and liveness detection workflows.

## Architecture

The service follows Clean Architecture principles with the following structure:

```
services/api-AI-support-service/
├── cmd/                    # Application entry points
│   └── main.py            # Main application setup
├── internal/              # Private application code
│   ├── domain/           # Business domain models and interfaces
│   ├── service/          # Business logic implementation
│   │   └── service.go    # Service implementations
│   └── infrastructure/   # External dependencies implementations (abstractions)
│       ├── events/       # Event handling (RabbitMQ)
│       ├── grpc/         # gRPC server handlers
│       └── repository/   # Data persistence
├── pkg/                  # Public packages
│   └── types/           # Shared types and models
└── README.md            # This file
```

### Layer Responsibilities

1. **Domain Layer** (`internal/domain/`)
   - Contains business domain interfaces
   - Defines contracts for repositories and services
   - Pure business logic, no implementation details

2. **Service Layer** (`internal/service/`)
   - Implements business logic
   - Uses repository interfaces
   - Coordinates between different parts of the system

3. **Infrastructure Layer** (`internal/infrastructure/`)
   - `repository/`: Implements data persistence
   - `events/`: Handles event publishing and consuming
   - `grpc/`: Handles gRPC communication

4. **Public Types** (`pkg/types/`)
   - Contains shared types and models
   - Can be imported by other services

## gRPC API

- Protobuf contracts live at `shared/proto/ekyc/v1/ekyc.proto`. Regenerate python bindings with:

  ```bash
  protoc -I shared -I shared/proto \
    --python_out=services/api-AI-support/internal/proto \
    shared/proto/ekyc/v1/ekyc.proto
  ```

- The service exposes two unary RPCs via `ekyc.v1.EkycSupportService`:
  - `PerformKtpOcr` – synchronous OCR over a KTP image using EasyOCR.
  - `ProcessEkyc` – orchestrates OCR plus asynchronous face matching & liveness evaluation. Returns OCR
    results immediately together with RabbitMQ job handles for the biometric checks.

## RabbitMQ Topology

| Purpose | Queue (env var) | Default |
| --- | --- | --- |
| Face match jobs | `AI_SUPPORT_FACE_QUEUE` | `ai.face_match.jobs` |
| Face match results | `AI_SUPPORT_FACE_RESULT_QUEUE` | `ai.face_match.results` |
| Liveness jobs | `AI_SUPPORT_LIVENESS_QUEUE` | `ai.liveness.jobs` |
| Liveness results | `AI_SUPPORT_LIVENESS_RESULT_QUEUE` | `ai.liveness.results` |

`FaceMatchWorker` and `LivenessWorker` consume the job queues concurrently and push structured JSON
results toward the corresponding result queues for the gateway to consume.

## Configuration

Key environment variables (see `pkg/types/config.py` for defaults):

- `AI_SUPPORT_SERVICE_NAME`
- `AI_SUPPORT_GRPC_ADDR` / `AI_SUPPORT_HTTP_ADDR`
- `AI_SUPPORT_DB_DSN`
- `AI_SUPPORT_RABBIT_URL`
- `AI_SUPPORT_OCR_LANGS` (comma separated, e.g. `id,en`)
- `AI_SUPPORT_FACE_THRESHOLD`
- `AI_SUPPORT_TORCH_DEVICE` (`cpu` by default)
- `AI_SUPPORT_LIVENESS_CONFIDENCE`
- Queue specific overrides listed in the RabbitMQ table above.

## Running Locally

1. Ensure PostgreSQL and RabbitMQ are reachable according to the configured DSNs. When using `tilt up`,
   the `rabbitmq` Deployment/Service is created automatically and port-forwarded on `5672` (AMQP) and
   `15672` (management UI).
2. Install python dependencies inside the `services/api-AI-support` virtualenv:

   ```bash
   pip install -r services/api-AI-support/requirements.txt
   ```

3. Start the service:

   ```bash
   python services/api-AI-support/cmd/main.py
   ```

The service automatically boots the HTTP health endpoint, the gRPC server, and the background workers
for face matching and liveness detection.
