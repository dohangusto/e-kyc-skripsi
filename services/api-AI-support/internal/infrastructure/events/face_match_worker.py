from __future__ import annotations

import base64
import json
from typing import Dict, Optional

from internal.domain.face_match import FaceMatchJob, FaceMatchProcessorPort, FaceMatchResultPublisher
from internal.infrastructure.events.rabbitmq import RabbitMqConnectionFactory, RabbitMqWorker
from internal.infrastructure.http.backoffice_client import BackofficeEkycClient


class FaceMatchWorker:
    def __init__(
        self,
        queue: str,
        factory: RabbitMqConnectionFactory,
        processor: FaceMatchProcessorPort,
        result_publisher: FaceMatchResultPublisher,
        backoffice_client: BackofficeEkycClient,
    ):
        self._processor = processor
        self._result_publisher = result_publisher
        self._backoffice = backoffice_client
        self._worker = RabbitMqWorker("face-match", queue, factory, self._handle_message, prefetch_count=1)

    def start(self) -> None:
        self._worker.start()

    def stop(self) -> None:
        self._worker.stop()

    def _handle_message(self, body: bytes, headers: Optional[Dict[str, str]]) -> None:
        payload = json.loads(body.decode("utf-8"))
        job = FaceMatchJob(
            job_id=payload["job_id"],
            session_id=payload["session_id"],
            threshold=float(payload.get("threshold", 0.8)),
            ktp_image=_decode(payload["ktp_image"]),
            selfie_image=_decode(payload["selfie_image"]),
            mime_type=payload.get("mime_type"),
        )
        result = self._processor.evaluate(job)
        self._result_publisher.publish(result)
        status = "DONE" if result.error is None else "FAILED"
        overall = "PASS" if result.matched else "FAIL"
        check = {
            "step": "ID_VS_SELFIE",
            "similarityScore": result.similarity,
            "threshold": result.threshold,
            "result": "PASS" if result.matched else "FAIL",
            "rawMetadata": {
                "jobId": job.job_id,
                "error": result.error,
            },
        }
        self._backoffice.record_face_checks(result.session_id, [check], overall, status)


def _decode(value: str) -> bytes:
    return base64.b64decode(value.encode("ascii"))
