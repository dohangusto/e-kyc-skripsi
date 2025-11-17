from __future__ import annotations

from uuid import uuid4

import grpc

from internal.domain.ekyc import (
    BinaryImage,
    EkycServicePort,
    FaceMatchRequestPayload,
    LivenessRequestPayload,
)
from internal.proto.ekyc.v1 import ekyc_pb2, ekyc_pb2_grpc


class EkycGrpcHandler(ekyc_pb2_grpc.EkycSupportServiceServicer):
    def __init__(self, service: EkycServicePort, default_threshold: float):
        self._service = service
        self._default_threshold = default_threshold

    def StartFaceMatchJob(
        self, request: ekyc_pb2.StartFaceMatchRequest, context: grpc.ServicerContext
    ) -> ekyc_pb2.StartFaceMatchResponse:
        if not request.ktp_image.content:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "ktp_image is required")
        if not request.selfie_image.content:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "selfie_image is required")

        session_id = request.session_id or str(uuid4())
        payload = FaceMatchRequestPayload(
            session_id=session_id,
            ktp_image=BinaryImage(
                content=request.ktp_image.content,
                mime_type=request.ktp_image.mime_type or None,
            ),
            selfie_image=BinaryImage(
                content=request.selfie_image.content,
                mime_type=request.selfie_image.mime_type or None,
            ),
            face_match_threshold=request.face_match_threshold
            or self._default_threshold,
        )
        handle = self._service.start_face_match(payload)
        return ekyc_pb2.StartFaceMatchResponse(
            job=_to_job_handle(handle),
        )

    def StartLivenessJob(
        self, request: ekyc_pb2.StartLivenessRequest, context: grpc.ServicerContext
    ) -> ekyc_pb2.StartLivenessResponse:
        session_id = request.session_id or str(uuid4())
        payload = LivenessRequestPayload(
            session_id=session_id,
            liveness_frames=[
                BinaryImage(
                    content=frame.content,
                    mime_type=frame.mime_type or None,
                )
                for frame in request.liveness_frames
            ],
            gestures=[gesture for gesture in request.gestures],
        )
        handle = self._service.start_liveness(payload)
        return ekyc_pb2.StartLivenessResponse(
            job=_to_liveness_handle(handle),
        )


def _to_job_handle(handle) -> ekyc_pb2.FaceMatchJobHandle:
    if handle is None:
        return ekyc_pb2.FaceMatchJobHandle()
    return ekyc_pb2.FaceMatchJobHandle(job_id=handle.job_id, queue=handle.queue)


def _to_liveness_handle(handle) -> ekyc_pb2.LivenessJobHandle:
    if handle is None:
        return ekyc_pb2.LivenessJobHandle()
    return ekyc_pb2.LivenessJobHandle(job_id=handle.job_id, queue=handle.queue)
