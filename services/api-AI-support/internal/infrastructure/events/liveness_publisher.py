from __future__ import annotations

import base64
from datetime import datetime, timezone

from internal.domain.jobs import AsyncJobHandle
from internal.domain.liveness import (
    LivenessJob,
    LivenessResult,
    LivenessResultPublisher,
    LivenessTaskPublisher,
)
from internal.infrastructure.events.rabbitmq import RabbitMqPublisher


class RabbitLivenessTaskPublisher(LivenessTaskPublisher):
    def __init__(self, publisher: RabbitMqPublisher, queue: str):
        self._publisher = publisher
        self._queue = queue

    def dispatch(self, job: LivenessJob) -> AsyncJobHandle:
        payload = {
            "job_id": job.job_id,
            "session_id": job.session_id,
            "gestures": list(job.gestures),
            "frames": [_encode(frame) for frame in job.frames],
            "mime_type": job.mime_type,
            "requested_at": datetime.now(timezone.utc).isoformat(),
        }
        headers = {"x-job-type": "liveness"}
        self._publisher.publish(self._queue, payload, headers=headers)
        return AsyncJobHandle(job_id=job.job_id, queue=self._queue)


class RabbitLivenessResultPublisher(LivenessResultPublisher):
    def __init__(self, publisher: RabbitMqPublisher, queue: str):
        self._publisher = publisher
        self._queue = queue

    def publish(self, result: LivenessResult) -> None:
        payload = {
            "job_id": result.job_id,
            "session_id": result.session_id,
            "passed": result.passed,
            "matched": list(result.matched_gestures),
            "missing": list(result.missing_gestures),
            "error": result.error,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }
        headers = {"x-job-type": "liveness.result"}
        self._publisher.publish(self._queue, payload, headers=headers)


def _encode(data: bytes) -> str:
    return base64.b64encode(data).decode("ascii")
