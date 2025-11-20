from __future__ import annotations

import logging
import os
import tempfile
from typing import Iterable, Optional

import cv2  # type: ignore
import numpy as np
import requests

logger = logging.getLogger(__name__)


class MediaStorageClient:
    def __init__(self, base_url: str):
        self._base = base_url.rstrip("/")
        self._session = requests.Session()

    def upload_bytes(self, name: str, data: bytes, mime: str) -> Optional[str]:
        try:
            response = self._session.post(
                f"{self._base}/media",
                files={"file": (name, data, mime)},
                timeout=10,
            )
            response.raise_for_status()
            body = response.json()
            return body.get("url")
        except requests.RequestException as exc:
            logger.warning("media upload failed: %s", exc)
            return None

    def upload_video_from_frames(self, session_id: str, frames: Iterable[bytes]) -> Optional[str]:
        buffer = encode_video(list(frames))
        if buffer is None:
            return None
        return self.upload_bytes(f"liveness-{session_id}.mp4", buffer, "video/mp4")


def encode_video(frames: list[bytes]) -> Optional[bytes]:
    if not frames:
        return None
    decoded = []
    for frame in frames:
        array = np.frombuffer(frame, dtype=np.uint8)
        image = cv2.imdecode(array, cv2.IMREAD_COLOR)
        if image is None:
            continue
        decoded.append(image)
    if not decoded:
        return None
    height, width = decoded[0].shape[:2]
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
    tmp.close()
    writer = cv2.VideoWriter(tmp.name, fourcc, 8.0, (width, height))
    try:
        for image in decoded:
            resized = cv2.resize(image, (width, height))
            writer.write(resized)
    finally:
        writer.release()
    try:
        with open(tmp.name, "rb") as fh:
            data = fh.read()
    finally:
        try:
            os.remove(tmp.name)
        except OSError:
            pass
    return data
