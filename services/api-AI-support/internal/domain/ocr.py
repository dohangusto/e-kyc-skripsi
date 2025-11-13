from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Mapping


@dataclass(frozen=True)
class KtpOcrResult:
    nik: str | None = None
    name: str | None = None
    birth_place: str | None = None
    birth_date: str | None = None
    gender: str | None = None
    blood_type: str | None = None
    address: str | None = None
    rt_rw: str | None = None
    village: str | None = None
    sub_district: str | None = None
    religion: str | None = None
    marital_status: str | None = None
    occupation: str | None = None
    citizenship: str | None = None
    issue_date: str | None = None
    raw_text: str = ""
    extra_fields: Mapping[str, str] = field(default_factory=dict)


class KtpOcrProvider(ABC):
    @abstractmethod
    def extract(self, image: bytes, locale: str | None = None) -> KtpOcrResult:
        """Run OCR over the supplied KTP image and return the parsed fields."""
        raise NotImplementedError
