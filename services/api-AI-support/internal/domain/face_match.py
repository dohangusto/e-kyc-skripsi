from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass

from internal.domain.jobs import AsyncJobHandle


@dataclass(frozen=True)
class FaceMatchJob:
    job_id: str
    session_id: str
    threshold: float
    ktp_image: bytes
    selfie_image: bytes
    mime_type: str | None = None


@dataclass(frozen=True)
class FaceMatchResult:
    job_id: str
    session_id: str
    similarity: float
    threshold: float
    matched: bool
    error: str | None = None


class FaceEmbeddingProvider(ABC):
    @abstractmethod
    def embed(self, image: bytes) -> list[float]:
        """Return an embedding vector for the supplied face image."""
        raise NotImplementedError


class FaceMatchTaskPublisher(ABC):
    @abstractmethod
    def dispatch(self, job: FaceMatchJob) -> AsyncJobHandle:
        """Publish a face-matching job to the asynchronous queue."""
        raise NotImplementedError


class FaceMatchResultPublisher(ABC):
    @abstractmethod
    def publish(self, result: FaceMatchResult) -> None:
        """Publish the finished result for downstream consumers."""
        raise NotImplementedError


class FaceMatchProcessorPort(ABC):
    @abstractmethod
    def evaluate(self, job: FaceMatchJob) -> FaceMatchResult:
        """Perform the actual face comparison for a job."""
        raise NotImplementedError
