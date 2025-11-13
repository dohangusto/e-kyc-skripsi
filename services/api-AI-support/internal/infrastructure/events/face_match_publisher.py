from __future__ import annotations

import base64
from datetime import datetime, timezone

from internal.domain.face_match import FaceMatchJob, FaceMatchResult, FaceMatchResultPublisher, FaceMatchTaskPublisher
from internal.domain.jobs import AsyncJobHandle
from internal.infrastructure.events.rabbitmq import RabbitMqPublisher


class RabbitFaceMatchTaskPublisher(FaceMatchTaskPublisher):
    def __init__(self, publisher: RabbitMqPublisher, queue: str):
        self._publisher = publisher
        self._queue = queue

    def dispatch(self, job: FaceMatchJob) -> AsyncJobHandle:
        payload = {
            "job_id": job.job_id,
            "session_id": job.session_id,
            "threshold": job.threshold,
            "ktp_image": _encode(job.ktp_image),
            "selfie_image": _encode(job.selfie_image),
            "mime_type": job.mime_type,
            "requested_at": datetime.now(timezone.utc).isoformat(),
        }
        headers = {"x-job-type": "face_match"}
        self._publisher.publish(self._queue, payload, headers=headers)
        return AsyncJobHandle(job_id=job.job_id, queue=self._queue)


class RabbitFaceMatchResultPublisher(FaceMatchResultPublisher):
    def __init__(self, publisher: RabbitMqPublisher, queue: str):
        self._publisher = publisher
        self._queue = queue

    def publish(self, result: FaceMatchResult) -> None:
        payload = {
            "job_id": result.job_id,
            "session_id": result.session_id,
            "matched": result.matched,
            "similarity": result.similarity,
            "threshold": result.threshold,
            "error": result.error,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }
        headers = {"x-job-type": "face_match.result"}
        self._publisher.publish(self._queue, payload, headers=headers)


def _encode(data: bytes) -> str:
    return base64.b64encode(data).decode("ascii")
