from __future__ import annotations

import io
import logging
import re
from typing import Dict, Iterable, List, Sequence, Tuple

import easyocr
import numpy as np
from PIL import Image

from internal.domain.ocr import KtpOcrProvider, KtpOcrResult

logger = logging.getLogger(__name__)


class EasyOcrProvider(KtpOcrProvider):
    def __init__(self, languages: Sequence[str], gpu: bool = False, min_confidence: float = 0.35):
        if not languages:
            raise ValueError("at least one language must be provided to EasyOCR")
        self._gpu = gpu
        self._min_confidence = min_confidence
        self._readers: Dict[Tuple[str, ...], easyocr.Reader] = {}
        self._default_key = self._normalize_languages(languages)
        self._readers[self._default_key] = self._build_reader(self._default_key)

    def extract(self, image: bytes, locale: str | None = None) -> KtpOcrResult:
        reader = self._resolve_reader(locale)
        np_image = _to_numpy(image)
        detections = reader.readtext(np_image)
        normalized_lines = [
            _normalize_text(text)
            for _, text, confidence in detections
            if confidence >= self._min_confidence and text.strip()
        ]
        raw_text = "\n".join(_denoise(text) for text in normalized_lines if text)
        fields = _parse_ktp_fields(normalized_lines)
        result = KtpOcrResult(raw_text=raw_text, **fields)
        return result

    def _resolve_reader(self, locale: str | None) -> easyocr.Reader:
        if not locale:
            return self._readers[self._default_key]
        key = self._normalize_languages((locale,) + self._default_key)
        if key not in self._readers:
            logger.info("initialising EasyOCR reader for locale(s): %s", ", ".join(key))
            self._readers[key] = self._build_reader(key)
        return self._readers[key]

    def _build_reader(self, languages: Tuple[str, ...]) -> easyocr.Reader:
        return easyocr.Reader(list(languages), gpu=self._gpu)

    @staticmethod
    def _normalize_languages(languages: Iterable[str]) -> Tuple[str, ...]:
        normalized = tuple(dict.fromkeys(lang.lower() for lang in languages if lang))
        if not normalized:
            raise ValueError("languages cannot be empty")
        return normalized


def _to_numpy(image_bytes: bytes) -> np.ndarray:
    with Image.open(io.BytesIO(image_bytes)) as img:
        array = np.array(img.convert("RGB"))
    return array


LABEL_PATTERNS = {
    "nik": re.compile(r"\b\d{12,17}\b"),
    "rt_rw": re.compile(r"RT/?RW[:\s]*([0-9]{1,3}\s*/\s*[0-9]{1,3})"),
}

FIELD_KEYWORDS = {
    "name": ("NAMA",),
    "birth_place_date": ("TEMPAT/TGL LAHIR", "TEMPAT / TGL LAHIR", "TEMPAT/ TGL LAHIR"),
    "gender": ("JENIS KELAMIN",),
    "blood_type": ("GOL DARAH", "GOLDARAH"),
    "address": ("ALAMAT",),
    "village": ("KEL", "DESA"),
    "sub_district": ("KEC", "KECAMATAN"),
    "religion": ("AGAMA",),
    "marital_status": ("STATUS PERKAWINAN",),
    "occupation": ("PEKERJAAN",),
    "citizenship": ("KEWARGANEGARAAN",),
    "issue_date": ("BERLAKU HINGGA",),
}


def _parse_ktp_fields(lines: List[str]) -> Dict[str, str | None]:
    normalized = [_denoise(line) for line in lines]
    data: Dict[str, str | None] = {
        "nik": _extract_nik(normalized),
        "name": _extract_by_label(normalized, FIELD_KEYWORDS["name"]),
        "gender": _extract_by_label(normalized, FIELD_KEYWORDS["gender"]),
        "blood_type": _extract_by_label(normalized, FIELD_KEYWORDS["blood_type"]),
        "address": _extract_address(normalized),
        "village": _extract_by_label(normalized, FIELD_KEYWORDS["village"]),
        "sub_district": _extract_by_label(normalized, FIELD_KEYWORDS["sub_district"]),
        "religion": _extract_by_label(normalized, FIELD_KEYWORDS["religion"]),
        "marital_status": _extract_by_label(normalized, FIELD_KEYWORDS["marital_status"]),
        "occupation": _extract_by_label(normalized, FIELD_KEYWORDS["occupation"]),
        "citizenship": _extract_by_label(normalized, FIELD_KEYWORDS["citizenship"]),
        "issue_date": _extract_by_label(normalized, FIELD_KEYWORDS["issue_date"]),
    }
    birth_place, birth_date = _extract_birth_info(normalized)
    data["birth_place"] = birth_place
    data["birth_date"] = birth_date
    data["rt_rw"] = _extract_rt_rw(normalized)
    extra = _collect_extra_fields(normalized, data)
    data["extra_fields"] = extra
    return data


def _extract_nik(lines: Sequence[str]) -> str | None:
    for line in lines:
        match = LABEL_PATTERNS["nik"].search(line)
        if match:
            return match.group(0)
    return None


def _extract_by_label(lines: Sequence[str], labels: Sequence[str]) -> str | None:
    for idx, line in enumerate(lines):
        for label in labels:
            if label in line:
                value = line.split(label, maxsplit=1)[-1].strip(" :")
                if value:
                    return value
                if idx + 1 < len(lines):
                    return lines[idx + 1].strip()
    return None


def _extract_birth_info(lines: Sequence[str]) -> tuple[str | None, str | None]:
    raw = _extract_by_label(lines, FIELD_KEYWORDS["birth_place_date"])
    if not raw:
        return None, None
    tokens = raw.replace(",", " ").split()
    if not tokens:
        return None, None
    place = tokens[0]
    date = " ".join(tokens[1:]) if len(tokens) > 1 else None
    return place, date


def _extract_rt_rw(lines: Sequence[str]) -> str | None:
    for line in lines:
        match = LABEL_PATTERNS["rt_rw"].search(line.replace(" ", ""))
        if match:
            return match.group(1).replace(" ", "")
    value = _extract_by_label(lines, ("RT/RW",))
    return value


def _collect_extra_fields(lines: Sequence[str], known: Dict[str, str | None]) -> Dict[str, str]:
    known_values = {value for value in known.values() if value}
    extra: Dict[str, str] = {}
    for idx, line in enumerate(lines):
        if not line.strip():
            continue
        if any(line.startswith(label) for labels in FIELD_KEYWORDS.values() for label in labels):
            continue
        if line in known_values:
            continue
        key = f"line_{idx+1}"
        extra[key] = line.strip()
    return extra


def _extract_address(lines: Sequence[str]) -> str | None:
    for idx, line in enumerate(lines):
        if "ALAMAT" not in line:
            continue
        value = line.split("ALAMAT", maxsplit=1)[-1].strip(" :")
        chunks: List[str] = []
        if value:
            chunks.append(value)
        cursor = idx + 1
        stop_labels = {
            label for key, labels in FIELD_KEYWORDS.items() if key != "address" for label in labels
        }
        while cursor < len(lines):
            candidate = lines[cursor]
            if any(stop in candidate for stop in stop_labels):
                break
            if candidate.strip():
                chunks.append(candidate.strip())
            cursor += 1
        return " ".join(chunks).strip() if chunks else None
    return None


def _normalize_text(text: str) -> str:
    return _denoise(text)


def _denoise(text: str) -> str:
    replaced = text.replace("\n", " ").replace("|", "I")
    return re.sub(r"\s+", " ", replaced).strip().upper()
