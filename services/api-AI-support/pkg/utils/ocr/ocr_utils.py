from __future__ import annotations

import cgi
import json
import logging
from functools import wraps
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler
from io import BytesIO
from typing import Any, Callable

logger = logging.getLogger(__name__)


def _log_call(fn: Callable[..., Any]) -> Callable[..., Any]:
    @wraps(fn)
    def wrapper(*args, **kwargs):
        logger.debug("ocr_utils.%s called", fn.__name__)
        try:
            result = fn(*args, **kwargs)
            logger.debug("ocr_utils.%s completed", fn.__name__)
            return result
        except Exception as exc:  # pragma: no cover - defensive
            logger.exception("ocr_utils.%s failed: %s", fn.__name__, exc)
            raise

    return wrapper


@_log_call
def read_image(handler: BaseHTTPRequestHandler) -> tuple[bytes | None, str | None]:
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


@_log_call
def read_image_with_fields(
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


@_log_call
def send_json(
    handler: BaseHTTPRequestHandler, status: HTTPStatus, payload: dict[str, Any]
) -> None:
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


@_log_call
def parse_ground_truth(fields: dict[str, str]) -> tuple[dict | None, str | None]:
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


@_log_call
def parse_bool(value: str | None, default: bool) -> bool:
    if value is None:
        return default
    normalized = str(value).strip().lower()
    if normalized in {"1", "true", "yes", "y", "on"}:
        return True
    if normalized in {"0", "false", "no", "n", "off"}:
        return False
    return default


@_log_call
def get_first(container: dict, key: str) -> str | None:
    if isinstance(container, dict) and key in container:
        value = container[key]
        if isinstance(value, list):
            return value[0] if value else None
        return value
    return None


@_log_call
def flatten_params(params: dict[str, list[str]]) -> dict[str, str]:
    flattened: dict[str, str] = {}
    for key, values in params.items():
        if values:
            flattened[key] = values[0]
    return flattened
