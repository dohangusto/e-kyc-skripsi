from __future__ import annotations

from uuid import uuid4

from internal.domain.ekyc import (
    EkycServicePort,
    FaceMatchRequestPayload,
    LivenessRequestPayload,
)
from internal.domain.face_match import FaceMatchJob, FaceMatchTaskPublisher
from internal.domain.jobs import AsyncJobHandle
from internal.domain.liveness import LivenessJob, LivenessTaskPublisher


class EkycService(EkycServicePort):
    def __init__(
        self,
        face_publisher: FaceMatchTaskPublisher,
        liveness_publisher: LivenessTaskPublisher,
    ):
        self._face_publisher = face_publisher
        self._liveness_publisher = liveness_publisher

    def start_face_match(self, payload: FaceMatchRequestPayload) -> AsyncJobHandle:
        face_job = FaceMatchJob(
            job_id=str(uuid4()),
            session_id=payload.session_id,
            threshold=max(payload.face_match_threshold, 0.0),
            ktp_image=payload.ktp_image.content,
            selfie_image=payload.selfie_image.content,
            mime_type=payload.selfie_image.mime_type or payload.ktp_image.mime_type,
        )
        return self._face_publisher.dispatch(face_job)

    def start_liveness(self, payload: LivenessRequestPayload) -> AsyncJobHandle:
        liveness_job = LivenessJob(
            job_id=str(uuid4()),
            session_id=payload.session_id,
            gestures=tuple(payload.gestures),
            frames=tuple(image.content for image in payload.liveness_frames),
            mime_type=(
                payload.liveness_frames[0].mime_type
                if payload.liveness_frames
                else None
            ),
        )
        return self._liveness_publisher.dispatch(liveness_job)
