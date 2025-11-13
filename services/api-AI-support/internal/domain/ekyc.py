from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Sequence

from internal.domain.face_match import FaceMatchJob
from internal.domain.jobs import AsyncJobHandle
from internal.domain.liveness import LivenessJob
from internal.domain.ocr import KtpOcrResult


@dataclass(frozen=True)
class BinaryImage:
    content: bytes
    mime_type: str | None = None


@dataclass(frozen=True)
class EkycRequestPayload:
    session_id: str
    ktp_image: BinaryImage
    selfie_image: BinaryImage
    liveness_frames: Sequence[BinaryImage]
    gestures: Sequence[str]
    face_match_threshold: float
    locale: str | None = None


@dataclass(frozen=True)
class EkycResponsePayload:
    ocr_result: KtpOcrResult
    face_match_job: AsyncJobHandle
    liveness_job: AsyncJobHandle
    face_match_task: FaceMatchJob | None = field(default=None, compare=False)
    liveness_task: LivenessJob | None = field(default=None, compare=False)


class EkycServicePort(ABC):
    @abstractmethod
    def process(self, payload: EkycRequestPayload) -> EkycResponsePayload:
        raise NotImplementedError
