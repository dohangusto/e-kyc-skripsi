from __future__ import annotations

import logging
from http.server import ThreadingHTTPServer
from socket import SOCK_STREAM, getaddrinfo
from threading import Thread
from typing import Tuple

from internal.infrastructure.http.ocr_http_handler import OcrHttpHandler

logger = logging.getLogger(__name__)


class HttpServer:
    def __init__(
        self,
        bind: str,
        ktp_ocr_extractor=None,
        ktp_ocr_professional_extractor=None,
    ):
        host, port = _parse_bind(bind)
        handler = type(
            "BoundOcrHttpHandler",
            (OcrHttpHandler,),
            {
                "ktp_ocr_extractor": staticmethod(ktp_ocr_extractor)
                if ktp_ocr_extractor is not None
                else None,
                "ktp_ocr_professional_extractor": staticmethod(
                    ktp_ocr_professional_extractor
                )
                if ktp_ocr_professional_extractor is not None
                else None,
            },
        )
        self._server = ThreadingHTTPServer((host, port), handler)
        self._thread: Thread | None = None

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            logger.debug("HTTP server already running")
            return
        logger.info("HTTP server starting")
        self._thread = Thread(target=self._server.serve_forever, daemon=True)
        self._thread.start()
        logger.info("HTTP server ready")

    def wait(self) -> None:
        if self._thread:
            logger.debug("HTTP server waiting for thread")
            self._thread.join()

    def stop(self) -> None:
        logger.info("HTTP server stopping")
        self._server.shutdown()
        self._server.server_close()
        if self._thread:
            self._thread.join()


def _parse_bind(bind: str) -> Tuple[str, int]:
    if ":" not in bind:
        raise ValueError("bind must include host and port")
    host, port_str = bind.rsplit(":", 1)
    port = int(port_str)
    resolved = getaddrinfo(host if host else None, port, type=SOCK_STREAM)
    if not resolved:
        raise ValueError("unable to resolve bind")
    _, _, _, _, sockaddr = resolved[0]
    logger.debug("HTTP bind resolved host=%s port=%s", sockaddr[0], sockaddr[1])
    return sockaddr[0], sockaddr[1]
