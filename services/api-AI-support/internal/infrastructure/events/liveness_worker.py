from __future__ import annotations

import base64
import json
from typing import Dict, Optional

from internal.domain.liveness import LivenessJob, LivenessProcessorPort, LivenessResultPublisher
from internal.infrastructure.events.rabbitmq import RabbitMqConnectionFactory, RabbitMqWorker


class LivenessWorker:
    def __init__(
        self,
        queue: str,
        factory: RabbitMqConnectionFactory,
        processor: LivenessProcessorPort,
        result_publisher: LivenessResultPublisher,
    ):
        self._processor = processor
        self._result_publisher = result_publisher
        self._worker = RabbitMqWorker("liveness", queue, factory, self._handle_message, prefetch_count=1)

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


def _decode(value: str) -> bytes:
    return base64.b64decode(value.encode("ascii"))
