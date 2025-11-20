from __future__ import annotations

import base64
import json
from typing import Dict, Optional

from internal.domain.liveness import (
    LivenessJob,
    LivenessProcessorPort,
    LivenessResultPublisher,
)
from internal.infrastructure.events.rabbitmq import (
    RabbitMqConnectionFactory,
    RabbitMqWorker,
)
from internal.infrastructure.http.backoffice_client import BackofficeEkycClient
from internal.infrastructure.http.media_client import MediaStorageClient, encode_video


class LivenessWorker:
    def __init__(
        self,
        queue: str,
        factory: RabbitMqConnectionFactory,
        processor: LivenessProcessorPort,
        result_publisher: LivenessResultPublisher,
        backoffice_client: BackofficeEkycClient,
        media_client: MediaStorageClient,
    ):
        self._processor = processor
        self._result_publisher = result_publisher
        self._backoffice = backoffice_client
        self._media = media_client
        self._worker = RabbitMqWorker(
            "liveness", queue, factory, self._handle_message, prefetch_count=1
        )

    def start(self) -> None:
        self._worker.start()

    def stop(self) -> None:
        self._worker.stop()

    def _handle_message(self, body: bytes, headers: Optional[Dict[str, str]]) -> None:
        payload = json.loads(body.decode("utf-8"))
        job = LivenessJob(
            job_id=payload["job_id"],
            session_id=payload["session_id"],
            gestures=tuple(payload.get("gestures", [])),
            frames=[_decode(frame) for frame in payload.get("frames", [])],
            mime_type=payload.get("mime_type"),
        )
        result = self._processor.evaluate(job)
        self._result_publisher.publish(result)
        video_url = self._upload_video(job)
        per_gesture = {gesture: "PASS" for gesture in result.matched_gestures}
        for gesture in result.missing_gestures:
            per_gesture[gesture] = "MISSING"
        status = "DONE" if result.error is None else "FAILED"
        overall = "PASS" if result.passed else "FAIL"
        metadata = {"jobId": job.job_id, "error": result.error}
        self._backoffice.record_liveness(
            result.session_id,
            overall,
            per_gesture,
            status,
            video_url,
            metadata,
        )

    def _upload_video(self, job: LivenessJob) -> Optional[str]:
        try:
            buffer = encode_video(job.frames)
            if buffer is None:
                return None
            return self._media.upload_bytes(
                f"liveness-{job.session_id}.mp4", buffer, "video/mp4"
            )
        except Exception:
            return None


def _decode(value: str) -> bytes:
    return base64.b64decode(value.encode("ascii"))
