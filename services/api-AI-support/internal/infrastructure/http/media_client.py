from __future__ import annotations

import logging
from typing import Any, Dict, Optional

import httpx

logger = logging.getLogger(__name__)


class MediaStorageClient:
    def __init__(self, base_url: str, timeout: float = 10.0) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout
        self._client = httpx.Client(timeout=timeout)

    def upload_bytes(
        self,
        data: bytes,
        *,
        filename: Optional[str] = None,
        mime_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        url = f"{self._base_url}/media"
        file_tuple = (
            filename or "upload",
            data,
            mime_type or "application/octet-stream",
        )
        files = {"file": file_tuple}
        logger.debug("Media upload start url=%s bytes=%s", url, len(data))
        response = self._client.post(url, files=files)
        if response.status_code >= 400:
            logger.warning(
                "Media upload failed status=%s body=%s",
                response.status_code,
                response.text,
            )
            response.raise_for_status()
        payload = response.json()
        logger.debug("Media upload completed id=%s", payload.get("id"))
        return payload
