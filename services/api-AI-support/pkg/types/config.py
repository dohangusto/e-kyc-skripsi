from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class AppConfig:
    service_name: str
    grpc_bind: str
    http_bind: str
    database_dsn: str
    rabbitmq_url: str
    face_match_queue: str
    face_match_result_queue: str
    liveness_queue: str
    liveness_result_queue: str
    ocr_languages: tuple[str, ...]
    default_face_threshold: float
    torch_device: str
    mediapipe_min_confidence: float

    @staticmethod
    def from_env() -> "AppConfig":
        return AppConfig(
            service_name=os.getenv("AI_SUPPORT_SERVICE_NAME", "api-AI-support"),
            grpc_bind=os.getenv("AI_SUPPORT_GRPC_ADDR", "0.0.0.0:50052"),
            http_bind=os.getenv("AI_SUPPORT_HTTP_ADDR", "0.0.0.0:8082"),
            database_dsn=os.getenv(
                "AI_SUPPORT_DB_DSN", "postgresql://postgres:postgres@localhost:5432/ai_support?sslmode=disable"
            ),
            rabbitmq_url=os.getenv("AI_SUPPORT_RABBIT_URL", "amqp://guest:guest@localhost:5672/"),
            face_match_queue=os.getenv("AI_SUPPORT_FACE_QUEUE", "ai.face_match.jobs"),
            face_match_result_queue=os.getenv("AI_SUPPORT_FACE_RESULT_QUEUE", "ai.face_match.results"),
            liveness_queue=os.getenv("AI_SUPPORT_LIVENESS_QUEUE", "ai.liveness.jobs"),
            liveness_result_queue=os.getenv("AI_SUPPORT_LIVENESS_RESULT_QUEUE", "ai.liveness.results"),
            ocr_languages=_parse_languages(os.getenv("AI_SUPPORT_OCR_LANGS", "id,en")),
            default_face_threshold=float(os.getenv("AI_SUPPORT_FACE_THRESHOLD", "0.78")),
            torch_device=os.getenv("AI_SUPPORT_TORCH_DEVICE", "cpu"),
            mediapipe_min_confidence=float(os.getenv("AI_SUPPORT_LIVENESS_CONFIDENCE", "0.5")),
        )


def _parse_languages(value: str) -> tuple[str, ...]:
    parts = [lang.strip().lower() for lang in value.split(",") if lang.strip()]
    return tuple(parts or ("id", "en"))
