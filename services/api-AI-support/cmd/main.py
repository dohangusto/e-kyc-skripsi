from __future__ import annotations

import logging
import os
import signal
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from internal.infrastructure.http.server import HttpServer
from internal.service.face_match_service import match_face_ktp_selfie
from internal.service.ocr_service import extract_ktp_fields, extract_ktp_identity
from pkg.types.config import AppConfig

logger = logging.getLogger(__name__)


def _configure_logging() -> None:
    level_name = (os.getenv("LOG_LEVEL") or "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
        force=True,
    )
    logging.captureWarnings(True)
    logger.info("Boot: logging configured level=%s", level_name)


def build_runtime() -> HttpServer:
    logger.info("Boot: loading configuration")
    config = AppConfig.from_env()
    logger.info("Boot: configuration loaded")
    logger.info(
        "Boot: face config model=%s threshold=%s max_side=%s max_upload=%s "
        "min_area_ktp=%s min_area_selfie=%s min_blur_ktp=%s min_blur_selfie=%s "
        "brightness=[%s,%s] allow_multi=%s media_storage=%s",
        config.insightface_model_pack,
        config.face_match_threshold,
        config.face_max_image_side,
        config.face_max_upload_bytes,
        config.face_min_area_ratio_ktp,
        config.face_min_area_ratio_selfie,
        config.face_min_blur_ktp,
        config.face_min_blur_selfie,
        config.face_brightness_min,
        config.face_brightness_max,
        config.face_allow_multi_select,
        config.media_storage_url,
    )
    logger.info("Boot: wiring HTTP handlers")
    try:
        http_server = HttpServer(
            config.http_bind,
            extract_ktp_fields,
            extract_ktp_identity,
            match_face_ktp_selfie,
            config.face_max_upload_bytes,
        )
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("Boot: HTTP server init failed error=%s", exc)
        raise
    logger.info("Boot: HTTP server configured bind=%s", config.http_bind)
    return http_server


def main() -> None:
    _configure_logging()
    logger.info("Boot: api-AI-support starting")
    try:
        http_server = build_runtime()

        def shutdown(signum, frame):
            logger.info("Shutdown signal received: %s", signum)
            http_server.stop()
            logger.info("Shutdown complete")
            sys.exit(0)

        signal.signal(signal.SIGTERM, shutdown)
        signal.signal(signal.SIGINT, shutdown)
        logger.info("HTTP server starting")
        http_server.start()
        logger.info("Boot: api-AI-support ready")
        http_server.wait()
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("Boot: fatal error error=%s", exc)
        raise


if __name__ == "__main__":
    main()
