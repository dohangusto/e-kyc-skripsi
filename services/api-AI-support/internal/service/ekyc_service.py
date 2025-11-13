from __future__ import annotations

from uuid import uuid4

from internal.domain.ekyc import EkycRequestPayload, EkycResponsePayload, EkycServicePort
from internal.domain.face_match import FaceMatchJob, FaceMatchTaskPublisher
from internal.domain.liveness import LivenessJob, LivenessTaskPublisher
from internal.domain.ocr import KtpOcrProvider


class EkycService(EkycServicePort):
    def __init__(
        self,
        ocr_provider: KtpOcrProvider,
        face_publisher: FaceMatchTaskPublisher,
        liveness_publisher: LivenessTaskPublisher,
    ):
        self._ocr_provider = ocr_provider
        self._face_publisher = face_publisher
        self._liveness_publisher = liveness_publisher

    def process(self, payload: EkycRequestPayload) -> EkycResponsePayload:
        ocr_result = self._ocr_provider.extract(payload.ktp_image.content, locale=payload.locale)

        face_job = FaceMatchJob(
            job_id=str(uuid4()),
            session_id=payload.session_id,
            threshold=max(payload.face_match_threshold, 0.0),
            ktp_image=payload.ktp_image.content,
            selfie_image=payload.selfie_image.content,
            mime_type=payload.selfie_image.mime_type or payload.ktp_image.mime_type,
        )
        face_handle = self._face_publisher.dispatch(face_job)

        liveness_job = LivenessJob(
            job_id=str(uuid4()),
            session_id=payload.session_id,
            gestures=tuple(payload.gestures),
            frames=tuple(image.content for image in payload.liveness_frames),
            mime_type=(payload.liveness_frames[0].mime_type if payload.liveness_frames else None),
        )
        liveness_handle = self._liveness_publisher.dispatch(liveness_job)

        return EkycResponsePayload(
            ocr_result=ocr_result,
            face_match_job=face_handle,
            liveness_job=liveness_handle,
            face_match_task=face_job,
            liveness_task=liveness_job,
        )
