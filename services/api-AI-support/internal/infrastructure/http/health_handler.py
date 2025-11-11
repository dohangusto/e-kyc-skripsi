from __future__ import annotations

import json
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler

from internal.domain.health import HealthServicePort


class HealthRequestHandler(BaseHTTPRequestHandler):
    service: HealthServicePort | None = None

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
            }
        ).encode("utf-8")
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        return
