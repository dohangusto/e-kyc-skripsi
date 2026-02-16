from __future__ import annotations

import logging
import signal
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from internal.infrastructure.http.server import HttpServer
from internal.service.ocr_service import extract_ktp_fields, extract_ktp_identity
from pkg.types.config import AppConfig

logger = logging.getLogger(__name__)


def build_runtime() -> HttpServer:
    config = AppConfig.from_env()
    http_server = HttpServer(
        config.http_bind,
        extract_ktp_fields,
        extract_ktp_identity,
    )
    logger.info("HTTP server configured bind=%s", config.http_bind)
    return http_server


def main() -> None:
    http_server = build_runtime()

    def shutdown(signum, frame):
        logger.info("Shutdown signal received: %s", signum)
        http_server.stop()
        sys.exit(0)

    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)
    logger.info("HTTP server starting")
    http_server.start()
    http_server.wait()


if __name__ == "__main__":
    main()
