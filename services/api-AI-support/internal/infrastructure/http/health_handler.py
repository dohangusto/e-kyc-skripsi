from __future__ import annotations

import cgi
import json
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler
from io import BytesIO

from internal.domain.health import HealthServicePort
from internal.domain.ocr import OcrRequest, OcrServicePort


class HealthRequestHandler(BaseHTTPRequestHandler):
    service: HealthServicePort | None = None
    ocr_service: OcrServicePort | None = None

    def do_POST(self):
        if self.path != "/ocr":
            self.send_response(HTTPStatus.NOT_FOUND)
            self.end_headers()
            return
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

    def do_GET(self):
        if self.path not in ("/healthz", "/health", "/"):
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
