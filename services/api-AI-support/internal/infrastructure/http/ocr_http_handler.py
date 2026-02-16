from __future__ import annotations

import json
import logging
import time
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler
from typing import Any
from urllib.parse import parse_qs, urlparse

from pkg.utils.face.face_utils import first_present, read_multipart_files
from pkg.utils.ocr.ocr_utils import (
    flatten_params,
    get_first,
    parse_bool,
    parse_ground_truth,
    read_image_with_fields,
    send_json,
)

logger = logging.getLogger(__name__)
_SERVICE_NAME = "api-AI-support"


class OcrHttpHandler(BaseHTTPRequestHandler):
    ktp_ocr_extractor: Any | None = None
    ktp_ocr_professional_extractor: Any | None = None
    face_match_fn: Any | None = None
    face_max_upload_bytes: int | None = None

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
            if parsed.path == "/face-match":
                self._handle_face_match(parsed)
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
        parsed = urlparse(self.path)
        if parsed.path in ("/health", "/healthz"):
            self._handle_health()
            return
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

    def _handle_face_match(self, parsed) -> None:
        logger.debug("Handling /face-match")
        if self.face_match_fn is None:
            logger.warning("Face match service unavailable")
            self.send_response(HTTPStatus.SERVICE_UNAVAILABLE)
            self.end_headers()
            return
        max_bytes = self.face_max_upload_bytes or 0
        if max_bytes:
            content_length = self.headers.get("Content-Length")
            if content_length:
                try:
                    length = int(content_length)
                except ValueError:
                    length = 0
                if length > max_bytes * 2:
                    payload = _error_payload("IMAGE_TOO_LARGE")
                    send_json(self, HTTPStatus.BAD_REQUEST, payload)
                    return
        files, fields, mime_types = read_multipart_files(self)
        if not files:
            payload = _error_payload("MISSING_IMAGE")
            send_json(self, HTTPStatus.BAD_REQUEST, payload)
            return
        ktp_image = first_present(files, "ktp_image", "ktp", "image_1")
        selfie_image = first_present(files, "selfie_image", "selfie", "image_2")
        if not ktp_image or not selfie_image:
            payload = _error_payload("MISSING_IMAGE_PAIR")
            send_json(self, HTTPStatus.BAD_REQUEST, payload)
            return
        if max_bytes and (len(ktp_image) > max_bytes or len(selfie_image) > max_bytes):
            payload = _error_payload("IMAGE_TOO_LARGE")
            send_json(self, HTTPStatus.BAD_REQUEST, payload)
            return
        if not _valid_image_mime(_pick_mime(mime_types, "ktp_image", "ktp", "image_1")):
            payload = _error_payload("INVALID_CONTENT_TYPE")
            send_json(self, HTTPStatus.BAD_REQUEST, payload)
            return
        if not _valid_image_mime(
            _pick_mime(mime_types, "selfie_image", "selfie", "image_2")
        ):
            payload = _error_payload("INVALID_CONTENT_TYPE")
            send_json(self, HTTPStatus.BAD_REQUEST, payload)
            return
        params = parse_qs(parsed.query)
        request_id = (
            get_first(fields, "request_id")
            or get_first(params, "request_id")
            or self.headers.get("X-Request-Id")
        )
        debug = parse_bool(
            get_first(fields, "debug") or get_first(params, "debug"),
            default=False,
        )
        metadata = _parse_metadata(
            fields.get("metadata") or get_first(params, "metadata")
        )
        logger.info(
            "Face match request_id=%s bytes_ktp=%s bytes_selfie=%s debug=%s",
            request_id,
            len(ktp_image),
            len(selfie_image),
            debug,
        )
        result = self.face_match_fn(
            ktp_image,
            selfie_image,
            request_id=request_id,
            debug=debug,
            metadata=metadata,
        )
        status = (
            HTTPStatus.OK if result.get("status") != "ERROR" else HTTPStatus.BAD_REQUEST
        )
        send_json(self, status, result)

    def _handle_health(self) -> None:
        logger.debug("Handling /health")
        send_json(self, HTTPStatus.OK, {"service": _SERVICE_NAME, "status": "ok"})

    def log_message(self, format, *args) -> None:
        return


def _valid_image_mime(mime: str | None) -> bool:
    if mime is None:
        return True
    return mime.startswith("image/")


def _error_payload(reason: str) -> dict:
    return {
        "status": "ERROR",
        "reasons": [reason],
        "match_score": 0.0,
        "match_score_100": 0,
        "ktp_media_ref": None,
        "selfie_media_ref": None,
        "ktp": None,
        "selfie": None,
        "timing_ms": {"total": 0, "detect_embed": 0},
        "debug_artifacts": None,
    }


def _parse_metadata(value: str | None) -> dict | None:
    if not value:
        return None
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return None


def _pick_mime(mime_types: dict[str, str], *keys: str) -> str | None:
    for key in keys:
        if key in mime_types:
            return mime_types[key]
    return None
