from __future__ import annotations

import cgi
import logging
from functools import wraps
from http.server import BaseHTTPRequestHandler
from io import BytesIO

logger = logging.getLogger(__name__)


def _log_call(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        logger.debug("face_utils.%s called", fn.__name__)
        try:
            result = fn(*args, **kwargs)
            logger.debug("face_utils.%s completed", fn.__name__)
            return result
        except Exception as exc:  # pragma: no cover - defensive
            logger.exception("face_utils.%s failed: %s", fn.__name__, exc)
            raise

    return wrapper


@_log_call
def read_multipart_files(
    handler: BaseHTTPRequestHandler,
) -> tuple[dict[str, bytes], dict[str, str], dict[str, str]]:
    content_type = handler.headers.get("Content-Type", "")
    length = int(handler.headers.get("Content-Length", "0"))
    if length <= 0 or not content_type.startswith("multipart/form-data"):
        return {}, {}, {}
    environ = {"REQUEST_METHOD": "POST"}
    fp = BytesIO(handler.rfile.read(length))
    form = cgi.FieldStorage(fp=fp, headers=handler.headers, environ=environ)
    files: dict[str, bytes] = {}
    fields: dict[str, str] = {}
    mime_types: dict[str, str] = {}
    for key in form.keys():
        field = form[key]
        if isinstance(field, list):
            field = field[0]
        if getattr(field, "file", None) is not None:
            if key not in files:
                files[str(key)] = field.file.read()
                mime = getattr(field, "type", None)
                if mime:
                    mime_types[str(key)] = str(mime)
            continue
        fields[str(key)] = str(getattr(field, "value", ""))
    return files, fields, mime_types


@_log_call
def first_present(files: dict[str, bytes], *names: str) -> bytes | None:
    for name in names:
        if name in files and files[name]:
            return files[name]
    return None
