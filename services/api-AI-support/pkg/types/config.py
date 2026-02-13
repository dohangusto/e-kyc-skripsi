from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

_BASE_DIR = Path(__file__).resolve().parents[2]
_DEFAULT_GCV_KEY = _BASE_DIR / "civil-honor-487003-j9-c4b3b0ddce2b.json"


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
    default_face_threshold: float
    torch_device: str
    mediapipe_min_confidence: float
    backoffice_http_base: str
    media_storage_url: str
    google_vision_credentials: str
    ocr_debug_dir: str
    ocr_max_image_side: int
    ocr_min_dim_target: int
    ocr_enable_crop: bool
    ocr_enable_binarize: bool
    ocr_enable_rotate_search: bool
    ocr_timeout_ms: int
    ocr_use_gpu: bool
    ocr_lang: str
    ocr_enable_two_pass: bool
    ocr_pass1_max_side: int
    ocr_roi_padding: int
    ocr_roi_max_side: int
    ocr_enable_fullpage_fallback: bool

    @staticmethod
    def from_env() -> "AppConfig":
        return AppConfig(
            service_name=os.getenv("AI_SUPPORT_SERVICE_NAME", "api-AI-support"),
            grpc_bind=os.getenv("AI_SUPPORT_GRPC_ADDR", "0.0.0.0:50052"),
            http_bind=os.getenv("AI_SUPPORT_HTTP_ADDR", "0.0.0.0:8082"),
            database_dsn=os.getenv(
                "AI_SUPPORT_DB_DSN",
                "postgresql://postgres:postgres@localhost:5432/ekyc_backoffice?sslmode=disable",
            ),
            rabbitmq_url=os.getenv(
                "AI_SUPPORT_RABBIT_URL", "amqp://guest:guest@localhost:5672/"
            ),
            face_match_queue=os.getenv("AI_SUPPORT_FACE_QUEUE", "ai.face_match.jobs"),
            face_match_result_queue=os.getenv(
                "AI_SUPPORT_FACE_RESULT_QUEUE", "ai.face_match.results"
            ),
            liveness_queue=os.getenv("AI_SUPPORT_LIVENESS_QUEUE", "ai.liveness.jobs"),
            liveness_result_queue=os.getenv(
                "AI_SUPPORT_LIVENESS_RESULT_QUEUE", "ai.liveness.results"
            ),
            default_face_threshold=float(
                os.getenv("AI_SUPPORT_FACE_THRESHOLD", "0.78")
            ),
            torch_device=os.getenv("AI_SUPPORT_TORCH_DEVICE", "cpu"),
            mediapipe_min_confidence=float(
                os.getenv("AI_SUPPORT_LIVENESS_CONFIDENCE", "0.5")
            ),
            backoffice_http_base=os.getenv(
                "AI_SUPPORT_BACKOFFICE_URL", "http://127.0.0.1:8081"
            ),
            media_storage_url=os.getenv(
                "AI_SUPPORT_MEDIA_URL", "http://127.0.0.1:8090"
            ),
            google_vision_credentials=os.getenv(
                "AI_SUPPORT_GCV_CREDENTIALS", str(_DEFAULT_GCV_KEY)
            ),
            ocr_debug_dir=os.getenv("OCR_DEBUG_DIR", "/tmp/api-ai-support-ocr"),
            ocr_max_image_side=int(os.getenv("OCR_MAX_IMAGE_SIDE", "2000")),
            ocr_min_dim_target=int(os.getenv("OCR_MIN_DIM_TARGET", "1000")),
            ocr_enable_crop=_env_bool("OCR_ENABLE_CROP", True),
            ocr_enable_binarize=_env_bool("OCR_ENABLE_BINARIZE", True),
            ocr_enable_rotate_search=_env_bool("OCR_ENABLE_ROTATE_SEARCH", True),
            ocr_timeout_ms=int(os.getenv("OCR_TIMEOUT_MS", "8000")),
            ocr_use_gpu=_env_bool("OCR_USE_GPU", False),
            ocr_lang=os.getenv("OCR_LANG", "en"),
            ocr_enable_two_pass=_env_bool("OCR_ENABLE_TWO_PASS", True),
            ocr_pass1_max_side=int(os.getenv("OCR_PASS1_MAX_SIDE", "800")),
            ocr_roi_padding=int(os.getenv("OCR_ROI_PADDING", "20")),
            ocr_roi_max_side=int(os.getenv("OCR_ROI_MAX_SIDE", "1200")),
            ocr_enable_fullpage_fallback=_env_bool(
                "OCR_ENABLE_FULLPAGE_FALLBACK", True
            ),
        )


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    normalized = value.strip().lower()
    if normalized in {"1", "true", "yes", "y", "on"}:
        return True
    if normalized in {"0", "false", "no", "n", "off"}:
        return False
    return default
