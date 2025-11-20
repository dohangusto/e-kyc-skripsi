from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

import requests

logger = logging.getLogger(__name__)


class BackofficeEkycClient:
    def __init__(self, base_url: str, timeout: float = 5.0) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout
        self._session = requests.Session()

    def record_face_checks(
        self,
        session_id: str,
        checks: List[Dict[str, Any]],
        overall: str,
        status: str,
    ) -> None:
        payload = {
            "checks": checks,
            "overallResult": overall,
            "status": status,
        }
        self._post(f"/api/ekyc/sessions/{session_id}/face-checks", payload)

    def record_liveness(
        self,
        session_id: str,
        overall: str,
        per_gesture: Dict[str, Any],
        status: str,
        video_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        payload = {
            "overallResult": overall,
            "perGestureResult": per_gesture,
            "recordedVideoUrl": video_url,
            "status": status,
            "rawMetadata": metadata or {},
        }
        self._post(f"/api/ekyc/sessions/{session_id}/liveness", payload)

    def _post(self, path: str, payload: Dict[str, Any]) -> None:
        url = f"{self._base_url}{path}"
        try:
            response = self._session.post(url, json=payload, timeout=self._timeout)
            if response.status_code >= 400:
                logger.warning(
                    "backoffice call %s failed with %s: %s",
                    path,
                    response.status_code,
                    response.text,
                )
        except requests.RequestException as exc:
            logger.warning("failed to call backoffice %s: %s", path, exc)
