from __future__ import annotations

import cgi
import json
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler
from io import BytesIO
from typing import Any, Callable
from urllib.parse import parse_qs, urlparse


def handle_ktp_ocr(
    handler: BaseHTTPRequestHandler,
    extractor: Callable[..., dict] | None,
) -> None:
    if extractor is None:
        handler.send_response(HTTPStatus.SERVICE_UNAVAILABLE)
        handler.end_headers()
        return
    parsed = urlparse(handler.path)
    image, _, fields = read_image_with_fields(handler)
    if not image:
        _send_json(handler, HTTPStatus.BAD_REQUEST, {"error": "MISSING_IMAGE"})
        return
    params = parse_qs(parsed.query)
    request_id = (
        _get_first(fields, "request_id")
        or _get_first(params, "request_id")
        or handler.headers.get("X-Request-Id")
    )
    ground_truth_source = fields or _flatten_params(params)
    ground_truth, error = _parse_ground_truth(ground_truth_source)
    if error:
        _send_json(handler, HTTPStatus.BAD_REQUEST, {"error": error})
        return
    try:
        result = extractor(image, request_id=request_id, ground_truth=ground_truth)
    except TypeError:
        result = extractor(image)
    status = HTTPStatus.OK if result.get("error") is None else HTTPStatus.BAD_REQUEST
    _send_json(handler, status, result)


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


def _send_json(
    handler: BaseHTTPRequestHandler, status: HTTPStatus, payload: dict[str, Any]
) -> None:
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


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


def _get_first(container: dict, key: str) -> str | None:
    if isinstance(container, dict) and key in container:
        value = container[key]
        if isinstance(value, list):
            return value[0] if value else None
        return value
    return None


def _flatten_params(params: dict[str, list[str]]) -> dict[str, str]:
    flattened: dict[str, str] = {}
    for key, values in params.items():
        if values:
            flattened[key] = values[0]
    return flattened
