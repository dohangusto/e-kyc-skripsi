from __future__ import annotations

from uuid import uuid4

import grpc

from internal.domain.ekyc import BinaryImage, EkycRequestPayload, EkycServicePort
from internal.domain.ocr import KtpOcrProvider, KtpOcrResult
from internal.proto.ekyc.v1 import ekyc_pb2, ekyc_pb2_grpc


class EkycGrpcHandler(ekyc_pb2_grpc.EkycSupportServiceServicer):
    def __init__(self, service: EkycServicePort, ocr_provider: KtpOcrProvider, default_threshold: float):
        self._service = service
        self._ocr_provider = ocr_provider
        self._default_threshold = default_threshold

    def PerformKtpOcr(self, request: ekyc_pb2.KtpOcrRequest, context: grpc.ServicerContext) -> ekyc_pb2.KtpOcrResponse:
        if not request.image.content:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "ktp image content is required")
        result = self._ocr_provider.extract(request.image.content, locale=_clean(request.locale))
        return ekyc_pb2.KtpOcrResponse(result=_to_proto_result(result))

    def ProcessEkyc(self, request: ekyc_pb2.EkycRequest, context: grpc.ServicerContext) -> ekyc_pb2.ProcessEkycResponse:
        if not request.ktp_image.content:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "ktp_image is required")
        if not request.selfie_image.content:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "selfie_image is required")

        session_id = request.session_id or str(uuid4())
        payload = EkycRequestPayload(
            session_id=session_id,
            ktp_image=BinaryImage(content=request.ktp_image.content, mime_type=request.ktp_image.mime_type or None),
            selfie_image=BinaryImage(content=request.selfie_image.content, mime_type=request.selfie_image.mime_type or None),
            liveness_frames=[
                BinaryImage(content=frame.content, mime_type=frame.mime_type or None) for frame in request.liveness_frames
            ],
            gestures=[gesture for gesture in request.gestures],
            face_match_threshold=request.face_match_threshold or self._default_threshold,
            locale=_clean(request.locale),
        )
        response = self._service.process(payload)
        return ekyc_pb2.ProcessEkycResponse(
            ocr=_to_proto_result(response.ocr_result),
            face_match_job=_to_job_handle(response.face_match_job),
            liveness_job=_to_liveness_handle(response.liveness_job),
        )


def _to_proto_result(result: KtpOcrResult) -> ekyc_pb2.KtpOcrResult:
    proto = ekyc_pb2.KtpOcrResult(
        nik=result.nik or "",
        name=result.name or "",
        birth_place=result.birth_place or "",
        birth_date=result.birth_date or "",
        gender=result.gender or "",
        blood_type=result.blood_type or "",
        address=result.address or "",
        rt_rw=result.rt_rw or "",
        village=result.village or "",
        sub_district=result.sub_district or "",
        religion=result.religion or "",
        marital_status=result.marital_status or "",
        occupation=result.occupation or "",
        citizenship=result.citizenship or "",
        issue_date=result.issue_date or "",
        raw_text=result.raw_text,
    )
    for key, value in (result.extra_fields or {}).items():
        field = proto.extra_fields.add()
        field.key = key
        field.value = value
    return proto


def _to_job_handle(handle) -> ekyc_pb2.FaceMatchJobHandle:
    if handle is None:
        return ekyc_pb2.FaceMatchJobHandle()
    return ekyc_pb2.FaceMatchJobHandle(job_id=handle.job_id, queue=handle.queue)


def _to_liveness_handle(handle) -> ekyc_pb2.LivenessJobHandle:
    if handle is None:
        return ekyc_pb2.LivenessJobHandle()
    return ekyc_pb2.LivenessJobHandle(job_id=handle.job_id, queue=handle.queue)


def _clean(value: str | None) -> str | None:
    return value or None
