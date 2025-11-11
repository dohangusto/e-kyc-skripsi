from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class AppConfig:
    service_name: str
    grpc_bind: str
    http_bind: str
    database_dsn: str

    @staticmethod
    def from_env() -> "AppConfig":
        return AppConfig(
            service_name=os.getenv("AI_SUPPORT_SERVICE_NAME", "api-AI-support"),
            grpc_bind=os.getenv("AI_SUPPORT_GRPC_ADDR", "0.0.0.0:50052"),
            http_bind=os.getenv("AI_SUPPORT_HTTP_ADDR", "0.0.0.0:8082"),
            database_dsn=os.getenv("AI_SUPPORT_DB_DSN", "postgresql://postgres:postgres@localhost:5432/ai_support?sslmode=disable"),
        )
