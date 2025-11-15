from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Sequence

from internal.domain.jobs import AsyncJobHandle


@dataclass(frozen=True)
class BinaryImage:
    content: bytes
    mime_type: str | None = None


@dataclass(frozen=True)
class FaceMatchRequestPayload:
    session_id: str
    ktp_image: BinaryImage
    selfie_image: BinaryImage
    face_match_threshold: float


@dataclass(frozen=True)
class LivenessRequestPayload:
    session_id: str
    liveness_frames: Sequence[BinaryImage]
    gestures: Sequence[str]


class EkycServicePort(ABC):
    @abstractmethod
    def start_face_match(self, payload: FaceMatchRequestPayload) -> AsyncJobHandle:
        raise NotImplementedError

    @abstractmethod
    def start_liveness(self, payload: LivenessRequestPayload) -> AsyncJobHandle:
        raise NotImplementedError
