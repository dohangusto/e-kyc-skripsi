from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class AppConfig:
    http_bind: str
    media_storage_url: str
    face_match_threshold: float
    insightface_model_pack: str
    face_max_image_side: int
    face_max_upload_bytes: int
    face_min_area_ratio_ktp: float
    face_min_area_ratio_selfie: float
    face_min_blur_ktp: float
    face_min_blur_selfie: float
    face_brightness_min: float
    face_brightness_max: float
    face_allow_multi_select: bool
    face_debug_dir: str
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
            http_bind=os.getenv("AI_SUPPORT_HTTP_ADDR", "0.0.0.0:8082"),
            media_storage_url=os.getenv(
                "MEDIA_STORAGE_HTTP_ENDPOINT",
                os.getenv("AI_SUPPORT_MEDIA_URL", "http://127.0.0.1:8090"),
            ),
            face_match_threshold=float(
                os.getenv(
                    "FACE_MATCH_THRESHOLD",
                    os.getenv("AI_SUPPORT_FACE_THRESHOLD", "0.78"),
                )
            ),
            insightface_model_pack=os.getenv(
                "INSIGHTFACE_MODEL_PACK",
                os.getenv("AI_SUPPORT_INSIGHTFACE_MODEL", "buffalo_s"),
            ),
            face_max_image_side=int(os.getenv("FACE_MAX_IMAGE_SIDE", "2400")),
            face_max_upload_bytes=int(os.getenv("FACE_MAX_UPLOAD_BYTES", "6000000")),
            face_min_area_ratio_ktp=float(
                os.getenv(
                    "FACE_MIN_AREA_RATIO_KTP", os.getenv("FACE_MIN_AREA_RATIO", "0.01")
                )
            ),
            face_min_area_ratio_selfie=float(
                os.getenv(
                    "FACE_MIN_AREA_RATIO_SELFIE",
                    os.getenv("FACE_MIN_AREA_RATIO", "0.02"),
                )
            ),
            face_min_blur_ktp=float(
                os.getenv("FACE_MIN_BLUR_KTP", os.getenv("FACE_MIN_BLUR", "40.0"))
            ),
            face_min_blur_selfie=float(
                os.getenv("FACE_MIN_BLUR_SELFIE", os.getenv("FACE_MIN_BLUR", "80.0"))
            ),
            face_brightness_min=float(os.getenv("FACE_BRIGHTNESS_MIN", "40")),
            face_brightness_max=float(os.getenv("FACE_BRIGHTNESS_MAX", "220")),
            face_allow_multi_select=_env_bool("FACE_ALLOW_MULTI_SELECT", False),
            face_debug_dir=os.getenv("FACE_DEBUG_DIR", "/tmp/api-ai-support-face"),
            ocr_debug_dir=os.getenv("OCR_DEBUG_DIR", "/tmp/api-ai-support-ocr"),
            ocr_max_image_side=int(os.getenv("OCR_MAX_IMAGE_SIDE", "2000")),
            ocr_min_dim_target=int(os.getenv("OCR_MIN_DIM_TARGET", "700")),
            ocr_enable_crop=_env_bool("OCR_ENABLE_CROP", True),
            ocr_enable_binarize=_env_bool("OCR_ENABLE_BINARIZE", True),
            ocr_enable_rotate_search=_env_bool("OCR_ENABLE_ROTATE_SEARCH", True),
            ocr_timeout_ms=int(os.getenv("OCR_TIMEOUT_MS", "8000")),
            ocr_use_gpu=_env_bool("OCR_USE_GPU", False),
            ocr_lang=os.getenv("OCR_LANG", "en"),
            ocr_enable_two_pass=_env_bool("OCR_ENABLE_TWO_PASS", True),
            ocr_pass1_max_side=int(os.getenv("OCR_PASS1_MAX_SIDE", "512")),
            ocr_roi_padding=int(os.getenv("OCR_ROI_PADDING", "20")),
            ocr_roi_max_side=int(os.getenv("OCR_ROI_MAX_SIDE", "700")),
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
