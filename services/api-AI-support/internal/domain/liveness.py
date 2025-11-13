from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Sequence

from internal.domain.jobs import AsyncJobHandle


@dataclass(frozen=True)
class LivenessJob:
    job_id: str
    session_id: str
    gestures: Sequence[str]
    frames: Sequence[bytes]
    mime_type: str | None = None


@dataclass(frozen=True)
class LivenessResult:
    job_id: str
    session_id: str
    passed: bool
    matched_gestures: Sequence[str] = field(default_factory=tuple)
    missing_gestures: Sequence[str] = field(default_factory=tuple)
    error: str | None = None


class GestureDetector(ABC):
    @abstractmethod
    def detect(self, frame: bytes) -> set[str]:
        """Return the gestures that are detected within a single frame."""
        raise NotImplementedError


class LivenessTaskPublisher(ABC):
    @abstractmethod
    def dispatch(self, job: LivenessJob) -> AsyncJobHandle:
        raise NotImplementedError


class LivenessResultPublisher(ABC):
    @abstractmethod
    def publish(self, result: LivenessResult) -> None:
        raise NotImplementedError


class LivenessProcessorPort(ABC):
    @abstractmethod
    def evaluate(self, job: LivenessJob) -> LivenessResult:
        raise NotImplementedError
