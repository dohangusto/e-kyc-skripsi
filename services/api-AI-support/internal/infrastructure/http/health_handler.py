from __future__ import annotations

import cgi
import json
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler
from io import BytesIO
from typing import Any
from urllib.parse import parse_qs, urlparse

from internal.domain.health import HealthServicePort
from internal.domain.ocr import OcrRequest, OcrServicePort


class HealthRequestHandler(BaseHTTPRequestHandler):
    service: HealthServicePort | None = None
    ocr_service: OcrServicePort | None = None
    ktp_ocr_extractor: Any | None = None

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/ocr":
            self._handle_google_ocr()
            return
        if parsed.path == "/ocr/ktp-debug":
            self._handle_ktp_ocr_debug(parsed)
            return
        self.send_response(HTTPStatus.NOT_FOUND)
        self.end_headers()
        return

    def _handle_google_ocr(self) -> None:
        if self.ocr_service is None:
            self.send_response(HTTPStatus.SERVICE_UNAVAILABLE)
            self.end_headers()
            return
        image, mime_type = _read_image(self)
        if not image:
            body = json.dumps({"error": "MISSING_IMAGE"}).encode("utf-8")
            self.send_response(HTTPStatus.BAD_REQUEST)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        result = self.ocr_service.extract_text(
            OcrRequest(image=image, mime_type=mime_type)
        )
        body = json.dumps(
            {
                "raw_text": result.text,
                "name": result.name,
                "birth_place_date": result.birth_place_date,
                "address": result.address,
                "error": result.error,
            }
        ).encode("utf-8")
        status = HTTPStatus.OK if result.error is None else HTTPStatus.BAD_REQUEST
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _handle_ktp_ocr_debug(self, parsed) -> None:
        if self.ktp_ocr_extractor is None:
            self.send_response(HTTPStatus.SERVICE_UNAVAILABLE)
            self.end_headers()
            return
        image, _, fields = _read_image_with_fields(self)
        if not image:
            body = json.dumps({"error": "MISSING_IMAGE"}).encode("utf-8")
            self.send_response(HTTPStatus.BAD_REQUEST)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        params = parse_qs(parsed.query)
        debug = _parse_bool(
            _get_first(fields, "debug") or _get_first(params, "debug"),
            default=True,
        )
        request_id = (
            _get_first(fields, "request_id")
            or _get_first(params, "request_id")
            or self.headers.get("X-Request-Id")
        )
        ground_truth, error = _parse_ground_truth(fields)
        if error:
            body = json.dumps({"error": error}).encode("utf-8")
            self.send_response(HTTPStatus.BAD_REQUEST)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        result = self.ktp_ocr_extractor(
            image, request_id=request_id, debug=debug, ground_truth=ground_truth
        )
        body = json.dumps(result).encode("utf-8")
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = urlparse(self.path).path
        if path not in ("/healthz", "/health", "/"):
            self.send_response(HTTPStatus.NOT_FOUND)
            self.end_headers()
            return
        status = self.service.check() if self.service else None
        if status is None:
            self.send_response(HTTPStatus.SERVICE_UNAVAILABLE)
            self.end_headers()
            return
        body = json.dumps(
            {
                "service": status.service,
                "status": status.status,
                "database": status.database,
                "vision": status.vision,
            }
        ).encode("utf-8")
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        return


def _read_image(handler: BaseHTTPRequestHandler) -> tuple[bytes | None, str | None]:
    content_type = handler.headers.get("Content-Type", "")
    if content_type.startswith("multipart/form-data"):
        environ = {"REQUEST_METHOD": "POST"}
        fp = BytesIO(
            handler.rfile.read(int(handler.headers.get("Content-Length", "0")))
        )
        form = cgi.FieldStorage(fp=fp, headers=handler.headers, environ=environ)
        for key in form.keys():
            field = form[key]
            if isinstance(field, list):
                field = field[0]
            if getattr(field, "file", None) is None:
                continue
            return field.file.read(), getattr(field, "type", None)
        return None, None
    length = int(handler.headers.get("Content-Length", "0"))
    if length <= 0:
        return None, None
    data = handler.rfile.read(length)
    if not data:
        return None, None
    return data, content_type or None


def _read_image_with_fields(
    handler: BaseHTTPRequestHandler,
) -> tuple[bytes | None, str | None, dict[str, str]]:
    content_type = handler.headers.get("Content-Type", "")
    length = int(handler.headers.get("Content-Length", "0"))
    if length <= 0:
        return None, None, {}
    if content_type.startswith("multipart/form-data"):
        environ = {"REQUEST_METHOD": "POST"}
        fp = BytesIO(handler.rfile.read(length))
        form = cgi.FieldStorage(fp=fp, headers=handler.headers, environ=environ)
        image = None
        mime_type = None
        fields: dict[str, str] = {}
        for key in form.keys():
            field = form[key]
            if isinstance(field, list):
                field = field[0]
            if getattr(field, "file", None) is not None:
                if image is None:
                    image = field.file.read()
                    mime_type = getattr(field, "type", None)
                continue
            fields[str(key)] = str(getattr(field, "value", ""))
        return image, mime_type, fields
    data = handler.rfile.read(length)
    return data, content_type or None, {}


def _parse_ground_truth(fields: dict[str, str]) -> tuple[dict | None, str | None]:
    if not fields:
        return None, None
    if "ground_truth" in fields:
        try:
            value = json.loads(fields["ground_truth"])
            if isinstance(value, dict):
                return value, None
            return None, "INVALID_GROUND_TRUTH"
        except json.JSONDecodeError:
            return None, "INVALID_GROUND_TRUTH"
    ground_truth = {}
    if "ground_truth_nik" in fields:
        ground_truth["nik"] = fields["ground_truth_nik"]
    if "ground_truth_name" in fields:
        ground_truth["name"] = fields["ground_truth_name"]
    return (ground_truth or None), None


def _parse_bool(value: str | None, default: bool) -> bool:
    if value is None:
        return default
    normalized = str(value).strip().lower()
    if normalized in {"1", "true", "yes", "y", "on"}:
        return True
    if normalized in {"0", "false", "no", "n", "off"}:
        return False
    return default


def _get_first(container: dict, key: str) -> str | None:
    if isinstance(container, dict) and key in container:
        value = container[key]
        if isinstance(value, list):
            return value[0] if value else None
        return value
    return None
