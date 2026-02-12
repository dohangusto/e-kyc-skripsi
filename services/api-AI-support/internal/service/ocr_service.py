from __future__ import annotations

import re
from typing import Any, Iterable

from google.cloud import vision

from internal.domain.ocr import OcrRequest, OcrResult, OcrServicePort

_LABELS = {
    "NIK",
    "NAMA",
    "TEMPAT/TGL LAHIR",
    "TEMPAT LAHIR",
    "TGL LAHIR",
    "TTL",
    "ALAMAT",
    "RT/RW",
    "KEL/DESA",
    "KECAMATAN",
    "KOTA",
    "KABUPATEN",
    "PROVINSI",
    "AGAMA",
    "STATUS PERKAWINAN",
    "PEKERJAAN",
    "KEWARGANEGARAAN",
    "BERLAKU HINGGA",
}

_LABEL_PATTERN = re.compile(r"^([A-Z/\\s]+)\\s*[:\\-]?\\s*(.*)$")


class OcrService(OcrServicePort):
    def __init__(self, vision_client: Any | None):
        self._vision_client = vision_client

    def extract_text(self, request: OcrRequest) -> OcrResult:
        if self._vision_client is None:
            return OcrResult(
                text="",
                confidence=0.0,
                error="VISION_CLIENT_NOT_READY",
            )
        try:
            image = vision.Image(content=request.image)
            response = self._vision_client.text_detection(image=image)
            if response.error and response.error.message:
                return OcrResult(
                    text="",
                    confidence=0.0,
                    error=response.error.message,
                )
            raw_text = ""
            if response.text_annotations:
                raw_text = response.text_annotations[0].description or ""
            name, birth, address = _parse_ktp(raw_text)
            return OcrResult(
                text=raw_text,
                confidence=0.0,
                name=name,
                birth_place_date=birth,
                address=address,
                error=None,
            )
        except Exception as exc:  # pragma: no cover - defensive
            return OcrResult(
                text="",
                confidence=0.0,
                error=str(exc),
            )


def _parse_ktp(raw_text: str) -> tuple[str | None, str | None, str | None]:
    if not raw_text:
        return None, None, None
    lines = _normalize_lines(raw_text)
    name = _extract_field(lines, {"NAMA"})
    birth = _extract_field(
        lines, {"TEMPAT/TGL LAHIR", "TEMPAT LAHIR", "TGL LAHIR", "TTL"}
    )
    address = _extract_multiline_field(lines, "ALAMAT")
    return name, birth, address


def _normalize_lines(raw_text: str) -> list[str]:
    cleaned: list[str] = []
    for line in raw_text.splitlines():
        value = re.sub(r"[\\t\\r]+", " ", line).strip()
        if not value:
            continue
        cleaned.append(value)
    return cleaned


def _extract_field(lines: Iterable[str], keys: set[str]) -> str | None:
    for index, line in enumerate(lines):
        label, value = _split_label(line)
        if label in keys:
            if value:
                return value
            return _next_value(lines, index + 1)
    return None


def _extract_multiline_field(lines: Iterable[str], key: str) -> str | None:
    lines_list = list(lines)
    for index, line in enumerate(lines_list):
        label, value = _split_label(line)
        if label == key:
            parts = []
            if value:
                parts.append(value)
            for next_line in lines_list[index + 1 :]:
                next_label, _ = _split_label(next_line)
                if next_label in _LABELS:
                    break
                parts.append(next_line)
            result = " ".join(parts).strip()
            return result or None
    return None


def _split_label(line: str) -> tuple[str, str]:
    match = _LABEL_PATTERN.match(line.upper())
    if not match:
        return "", line.strip()
    label = match.group(1).strip()
    value = match.group(2).strip()
    return label, value


def _next_value(lines: Iterable[str], start: int) -> str | None:
    lines_list = list(lines)
    for next_line in lines_list[start:]:
        label, value = _split_label(next_line)
        if label in _LABELS:
            return None
        if value:
            return value
    return None
