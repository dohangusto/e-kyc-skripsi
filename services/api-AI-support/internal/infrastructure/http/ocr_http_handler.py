from __future__ import annotations

import logging
import time
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler
from typing import Any
from urllib.parse import parse_qs, urlparse

from pkg.utils.ocr.ocr_utils import (
    flatten_params,
    get_first,
    parse_bool,
    parse_ground_truth,
    read_image_with_fields,
    send_json,
)

logger = logging.getLogger(__name__)


class OcrHttpHandler(BaseHTTPRequestHandler):
    ktp_ocr_extractor: Any | None = None
    ktp_ocr_professional_extractor: Any | None = None

    def do_POST(self) -> None:
        start = time.monotonic()
        content_length = self.headers.get("Content-Length")
        content_type = self.headers.get("Content-Type")
        logger.info(
            "HTTP request method=%s path=%s client=%s length=%s type=%s",
            self.command,
            self.path,
            self.client_address,
            content_length,
            content_type,
        )
        parsed = urlparse(self.path)
        try:
            if parsed.path == "/ocr/ktp":
                self._handle_ktp_ocr(parsed)
                return
            if parsed.path == "/ocr/ktp-debug":
                self._handle_ktp_ocr_debug(parsed)
                return
            logger.warning("HTTP route not found path=%s", parsed.path)
            self.send_response(HTTPStatus.NOT_FOUND)
            self.end_headers()
        except Exception as exc:  # pragma: no cover - defensive
            logger.exception("HTTP handler failed path=%s error=%s", self.path, exc)
            send_json(
                self, HTTPStatus.INTERNAL_SERVER_ERROR, {"error": "INTERNAL_ERROR"}
            )
        finally:
            duration_ms = int((time.monotonic() - start) * 1000)
            logger.info(
                "HTTP request completed method=%s path=%s duration_ms=%s",
                self.command,
                self.path,
                duration_ms,
            )

    def do_GET(self) -> None:
        logger.info(
            "HTTP request method=%s path=%s client=%s",
            self.command,
            self.path,
            self.client_address,
        )
        self.send_response(HTTPStatus.NOT_FOUND)
        self.end_headers()

    def _handle_ktp_ocr(self, parsed) -> None:
        logger.debug("Handling /ocr/ktp")
        if self.ktp_ocr_professional_extractor is None:
            logger.warning("KTP OCR extractor unavailable")
            self.send_response(HTTPStatus.SERVICE_UNAVAILABLE)
            self.end_headers()
            return
        image, _, fields = read_image_with_fields(self)
        if not image:
            logger.warning("KTP OCR missing image")
            send_json(self, HTTPStatus.BAD_REQUEST, {"error": "MISSING_IMAGE"})
            return
        params = parse_qs(parsed.query)
        request_id = (
            get_first(fields, "request_id")
            or get_first(params, "request_id")
            or self.headers.get("X-Request-Id")
        )
        ground_truth_source = fields or flatten_params(params)
        ground_truth, error = parse_ground_truth(ground_truth_source)
        if error:
            logger.warning("KTP OCR invalid ground_truth error=%s", error)
            send_json(self, HTTPStatus.BAD_REQUEST, {"error": error})
            return
        logger.info(
            "KTP OCR request_id=%s image_bytes=%s",
            request_id,
            len(image),
        )
        try:
            result = self.ktp_ocr_professional_extractor(
                image, request_id=request_id, ground_truth=ground_truth
            )
        except TypeError:
            result = self.ktp_ocr_professional_extractor(image)
        status = (
            HTTPStatus.OK if result.get("error") is None else HTTPStatus.BAD_REQUEST
        )
        send_json(self, status, result)

    def _handle_ktp_ocr_debug(self, parsed) -> None:
        logger.debug("Handling /ocr/ktp-debug")
        if self.ktp_ocr_extractor is None:
            logger.warning("KTP OCR debug extractor unavailable")
            self.send_response(HTTPStatus.SERVICE_UNAVAILABLE)
            self.end_headers()
            return
        image, _, fields = read_image_with_fields(self)
        if not image:
            logger.warning("KTP OCR debug missing image")
            send_json(self, HTTPStatus.BAD_REQUEST, {"error": "MISSING_IMAGE"})
            return
        params = parse_qs(parsed.query)
        debug = parse_bool(
            get_first(fields, "debug") or get_first(params, "debug"),
            default=True,
        )
        request_id = (
            get_first(fields, "request_id")
            or get_first(params, "request_id")
            or self.headers.get("X-Request-Id")
        )
        ground_truth, error = parse_ground_truth(fields)
        if error:
            logger.warning("KTP OCR debug invalid ground_truth error=%s", error)
            send_json(self, HTTPStatus.BAD_REQUEST, {"error": error})
            return
        logger.info(
            "KTP OCR debug request_id=%s debug=%s image_bytes=%s",
            request_id,
            debug,
            len(image),
        )
        result = self.ktp_ocr_extractor(
            image, request_id=request_id, debug=debug, ground_truth=ground_truth
        )
        send_json(self, HTTPStatus.OK, result)

    def log_message(self, format, *args) -> None:
        return
