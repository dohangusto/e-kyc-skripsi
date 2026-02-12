from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True)
class OcrRequest:
    image: bytes
    mime_type: str | None = None


@dataclass(frozen=True)
class OcrResult:
    text: str
    confidence: float
    name: str | None = None
    birth_place_date: str | None = None
    address: str | None = None
    error: str | None = None


class OcrServicePort(ABC):
    @abstractmethod
    def extract_text(self, request: OcrRequest) -> OcrResult:
        raise NotImplementedError
