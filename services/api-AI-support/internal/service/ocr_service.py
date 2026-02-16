from __future__ import annotations

import functools
import importlib
import importlib.util
import inspect
import logging
import os
import re
import threading
import time
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, Iterable
from uuid import uuid4

logger = logging.getLogger(__name__)

from pkg.types.config import AppConfig

_NUMPY_AVAILABLE = importlib.util.find_spec("numpy") is not None
_CV2_AVAILABLE = importlib.util.find_spec("cv2") is not None


class _LazyModule:
    def __init__(self, name: str):
        self._name = name
        self._module = None

    def _load(self):
        if self._module is None:
            logger.debug("Lazy import module=%s", self._name)
            self._module = importlib.import_module(self._name)
        return self._module

    def __getattr__(self, item):
        return getattr(self._load(), item)


np = _LazyModule("numpy") if _NUMPY_AVAILABLE else None  # type: ignore
cv2 = _LazyModule("cv2") if _CV2_AVAILABLE else None  # type: ignore

_LABEL_EXCLUDES = {
    "NIK",
    "NAMA",
    "NAMA LENGKAP",
    "ALAMAT",
    "RT/RW",
    "KEL/DESA",
    "KECAMATAN",
    "PROVINSI",
    "KABUPATEN",
    "KOTA",
    "AGAMA",
    "STATUS PERKAWINAN",
    "PEKERJAAN",
    "BERLAKU HINGGA",
    "TEMPAT",
    "TEMPAT/TGL LAHIR",
    "TTL",
    "TGL LAHIR",
    "LAHIR",
    "GOL DARAH",
    "GOL. DARAH",
    "JENIS KELAMIN",
    "KEWARGANEGARAAN",
    "STATUS",
}

_KNOWN_LABELS = {
    *{label for label in _LABEL_EXCLUDES},
    "TEMPAT LAHIR",
    "JENIS KELAMIN",
    "AGAMA",
}

_NAME_LABEL_PATTERN = re.compile(r"(?i)\bNama\b\s*[:\-]?\s*(.*)$")
_ANCHOR_NIK_PATTERN = re.compile(r"(?i)\bNIK\b")
_ANCHOR_NAMA_PATTERN = re.compile(r"(?i)\bNAMA\b")

_BIRTH_LABEL_PATTERNS = (
    re.compile(r"(?i)TEMPAT\s*[/,]?\s*TGL\s*LAHIR\b\s*[:\-]?\s*(.*)$"),
    re.compile(r"(?i)TTL\b\s*[:\-]?\s*(.*)$"),
)
_BIRTH_PLACE_LABEL_PATTERNS = (re.compile(r"(?i)TEMPAT\s*LAHIR\b\s*[:\-]?\s*(.*)$"),)
_BIRTH_DATE_LABEL_PATTERNS = (re.compile(r"(?i)TGL\s*LAHIR\b\s*[:\-]?\s*(.*)$"),)
_GENDER_LABEL_PATTERNS = (
    re.compile(r"(?i)JENIS\s*KELAMIN\b\s*[:\-]?\s*(.*)$"),
    re.compile(r"(?i)KELAMIN\b\s*[:\-]?\s*(.*)$"),
)
_RELIGION_LABEL_PATTERNS = (re.compile(r"(?i)AGAMA\b\s*[:\-]?\s*(.*)$"),)
_DATE_PATTERN = re.compile(r"(\d{1,2})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{2,4})")

_GENDER_CANONICAL = {
    "LAKI-LAKI": "LAKI-LAKI",
    "PEREMPUAN": "PEREMPUAN",
}

_RELIGION_CANONICAL = {
    "ISLAM": "ISLAM",
    "KRISTEN": "KRISTEN",
    "KATOLIK": "KATOLIK",
    "HINDU": "HINDU",
    "BUDDHA": "BUDDHA",
    "KONGHUCU": "KONGHUCU",
}

_RELIGION_ALIASES = {
    "PROTESTAN": "KRISTEN",
    "KRISTIAN": "KRISTEN",
    "KATHOLIK": "KATOLIK",
    "CATHOLIC": "KATOLIK",
    "BUDHA": "BUDDHA",
    "KONGFUCU": "KONGHUCU",
    "KONFHUCU": "KONGHUCU",
    "CONFUCIUS": "KONGHUCU",
}

_PADDLE_OCR_ENGINE: Any | None = None
_PADDLE_OCR_LOCK = threading.Lock()
_PADDLE_OCR_INIT_LOGGED = False
_OCR_CONFIG_LOGGED = False


class _OcrTimeoutError(RuntimeError):
    pass


@dataclass(frozen=True)
class _OcrSettings:
    debug_dir: Path
    max_image_side: int
    min_dim_target: int
    enable_crop: bool
    enable_binarize: bool
    enable_rotate_search: bool
    timeout_ms: int
    use_gpu: bool
    lang: str
    enable_two_pass: bool
    pass1_max_side: int
    roi_padding: int
    roi_max_side: int
    enable_fullpage_fallback: bool


@dataclass(frozen=True)
class _TwoPassResult:
    lines: list[dict]
    text: str
    used_binarize: bool
    steps: list[str]
    pass1_ms: int
    pass2_ms: int
    pass1_lines: list[dict]
    pass1_text: str
    pass2_lines: list[dict]


def extract_ktp_fields(
    image_bytes: bytes,
    *,
    request_id: str | None = None,
    debug: bool = False,
    ground_truth: dict | None = None,
) -> dict:
    logger.info(
        "OCR extract_ktp_fields start request_id=%s debug=%s bytes=%s has_ground_truth=%s",
        request_id,
        debug,
        len(image_bytes) if image_bytes else 0,
        bool(ground_truth),
    )
    settings = _load_ocr_settings()
    global _OCR_CONFIG_LOGGED
    if not _OCR_CONFIG_LOGGED:
        _OCR_CONFIG_LOGGED = True
        logger.info(
            "OCR config: two_pass=%s timeout_ms=%s pass1_max=%s roi_max=%s fullpage_fallback=%s",
            settings.enable_two_pass,
            settings.timeout_ms,
            settings.pass1_max_side,
            settings.roi_max_side,
            settings.enable_fullpage_fallback,
        )
    steps: list[str] = []
    debug_artifacts = _init_debug_artifacts(settings, request_id, debug)
    request_start = time.monotonic()
    timeout_start = request_start
    pass1_ms = 0
    pass2_ms = 0
    used_two_pass = False
    roi_lines_for_fields: list[dict] | None = None

    def check_timeout() -> None:
        if (time.monotonic() - timeout_start) * 1000 > settings.timeout_ms:
            raise _OcrTimeoutError("OCR_TIMEOUT")

    try:
        engine = None
        if _PADDLE_OCR_ENGINE is None:
            engine = _get_ocr_engine(settings)
            timeout_start = time.monotonic()
        if not image_bytes:
            raise ValueError("empty image bytes")
        image = _load_image(image_bytes)
        if debug_artifacts is not None:
            _write_debug_image(debug_artifacts, "original", image)

        if settings.enable_crop:
            cropped, method = _safe_crop(image)
            if method:
                image = cropped
                steps.append(f"crop:{method}")
                if debug_artifacts is not None:
                    _write_debug_image(debug_artifacts, "cropped", image)

        if engine is None:
            engine = _get_ocr_engine(settings)

        timeout_start = time.monotonic()

        ocr_lines: list[dict] = []
        raw_text = ""
        selected_binarized = False
        if settings.enable_two_pass:
            timeout_start = time.monotonic()
            two_pass = _run_two_pass_ocr(engine, image, settings, check_timeout)
            pass1_ms = two_pass.pass1_ms
            pass2_ms = two_pass.pass2_ms
            steps.extend(two_pass.steps)
            if two_pass.lines:
                ocr_lines = two_pass.lines
                raw_text = two_pass.text
                selected_binarized = two_pass.used_binarize
                used_two_pass = True
                roi_lines_for_fields = two_pass.pass2_lines or None
                steps.append("two-pass:roi")
            elif two_pass.pass1_lines:
                nik_pass1, _ = _extract_nik_from_lines(two_pass.pass1_lines)
                name_pass1, _ = _extract_name_from_lines(two_pass.pass1_lines)
                if nik_pass1 and name_pass1:
                    ocr_lines = two_pass.pass1_lines
                    raw_text = two_pass.pass1_text
                    steps.append("two-pass:pass1-only")
                elif not settings.enable_fullpage_fallback:
                    ocr_lines = two_pass.pass1_lines
                    raw_text = two_pass.pass1_text
        if not ocr_lines:
            timeout_start = time.monotonic()
            angle = 0
            if settings.enable_rotate_search:
                angle = _select_best_rotation(engine, image, check_timeout)
            if angle:
                image = _rotate_image(image, angle)
                steps.append(f"rotate:{angle}")
                if debug_artifacts is not None:
                    _write_debug_image(debug_artifacts, "rotated", image)

            check_timeout()

            resized, resize_tag = _resize_to_target(
                image, settings.min_dim_target, settings.max_image_side
            )
            if resize_tag:
                image = resized
                steps.append(resize_tag)
                if debug_artifacts is not None:
                    _write_debug_image(debug_artifacts, "resized", image)

            check_timeout()

            ocr_lines, raw_text, selected_binarized = _run_best_ocr(
                engine, image, settings, debug_artifacts, check_timeout
            )
            pass1_ms = pass1_ms or 0
            pass2_ms = pass2_ms or 0
        if selected_binarized and not used_two_pass:
            steps.append("binarize:otsu")

        nik = None
        nik_conf = 0.0
        name = None
        name_conf = 0.0
        if roi_lines_for_fields:
            nik, nik_conf = _extract_nik_from_lines(roi_lines_for_fields)
            name, name_conf = _extract_name_from_lines(roi_lines_for_fields)
        if not nik or not name:
            fallback_nik, fallback_nik_conf = _extract_nik_from_lines(ocr_lines)
            fallback_name, fallback_name_conf = _extract_name_from_lines(ocr_lines)
            if not nik:
                nik, nik_conf = fallback_nik, fallback_nik_conf
            if not name:
                name, name_conf = fallback_name, fallback_name_conf

        nik_score = _score_nik(nik, nik_conf, ground_truth)
        name_score = _score_name(name, name_conf, ground_truth)

        result = _build_result(
            nik=nik,
            name=name,
            nik_score=nik_score,
            name_score=name_score,
            ocr_time_ms=_elapsed_ms(request_start),
            steps=steps,
            raw_lines=ocr_lines,
            raw_text=raw_text,
            debug_artifacts=debug_artifacts,
        )
        logger.info(
            "OCR extract_ktp_fields completed request_id=%s nik_score=%s name_score=%s steps=%s",
            request_id,
            result.get("nik_score"),
            result.get("name_score"),
            steps,
        )
        return result
    except _OcrTimeoutError as exc:
        logger.warning("OCR timeout", extra={"error": str(exc)})
        _write_debug_error(debug_artifacts, str(exc))
        return _build_error_result(request_start, steps, debug_artifacts)
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("OCR extraction failed")
        _write_debug_error(debug_artifacts, str(exc))
        return _build_error_result(request_start, steps, debug_artifacts)
    finally:
        total_ms = _elapsed_ms(request_start)
        logger.info(
            "OCR timing: time_pass1_ms=%s time_pass2_ms=%s time_total_ms=%s",
            pass1_ms,
            pass2_ms,
            total_ms,
        )


def extract_ktp_identity(
    image_bytes: bytes,
    *,
    request_id: str | None = None,
    ground_truth: dict | None = None,
) -> dict:
    logger.info(
        "OCR extract_ktp_identity start request_id=%s bytes=%s has_ground_truth=%s",
        request_id,
        len(image_bytes) if image_bytes else 0,
        bool(ground_truth),
    )
    result = extract_ktp_fields(
        image_bytes, request_id=request_id, debug=False, ground_truth=ground_truth
    )
    lines = result.get("raw_ocr_lines") or []
    raw_text = result.get("raw_ocr_text") or ""

    nik = result.get("nik")
    name = result.get("name")
    nik_score = result.get("nik_score")
    name_score = result.get("name_score")
    birth_place, birth_date = _extract_birth_place_date(lines, raw_text, name)
    gender = _extract_gender(lines, raw_text)
    religion = _extract_religion(lines, raw_text)

    error = None
    if not raw_text and not any([nik, name, birth_place, birth_date, gender, religion]):
        error = "OCR_EMPTY"

    response = {
        "nik": nik,
        "nama": name,
        "tempat_lahir": birth_place,
        "tanggal_lahir": birth_date,
        "jenis_kelamin": gender,
        "agama": religion,
        "nik_score": nik_score,
        "nama_score": name_score,
        "error": error,
    }
    logger.info(
        "OCR extract_ktp_identity completed request_id=%s error=%s",
        request_id,
        error,
    )
    return response


def _load_ocr_settings() -> _OcrSettings:
    config = AppConfig.from_env()
    return _OcrSettings(
        debug_dir=Path(config.ocr_debug_dir),
        max_image_side=config.ocr_max_image_side,
        min_dim_target=config.ocr_min_dim_target,
        enable_crop=config.ocr_enable_crop,
        enable_binarize=config.ocr_enable_binarize,
        enable_rotate_search=config.ocr_enable_rotate_search,
        timeout_ms=config.ocr_timeout_ms,
        use_gpu=config.ocr_use_gpu,
        lang=config.ocr_lang,
        enable_two_pass=config.ocr_enable_two_pass,
        pass1_max_side=config.ocr_pass1_max_side,
        roi_padding=config.ocr_roi_padding,
        roi_max_side=config.ocr_roi_max_side,
        enable_fullpage_fallback=config.ocr_enable_fullpage_fallback,
    )


def _init_debug_artifacts(
    settings: _OcrSettings, request_id: str | None, debug: bool
) -> dict | None:
    if not debug:
        return None
    base = settings.debug_dir
    safe_request = _safe_request_id(request_id) if request_id else "request"
    run_id = uuid4().hex[:8]
    debug_dir = base / f"{safe_request}-{run_id}"
    debug_dir.mkdir(parents=True, exist_ok=True)
    return {"_dir": str(debug_dir)}


def _write_debug_image(
    debug_artifacts: dict | None, key: str, image: np.ndarray
) -> None:
    if debug_artifacts is None:
        return
    if not _CV2_AVAILABLE:
        return
    output_dir = Path(debug_artifacts["_dir"])
    filename = output_dir / f"{key}.png"
    cv2.imwrite(str(filename), image)
    debug_artifacts[key] = str(filename)


def _write_debug_error(debug_artifacts: dict | None, message: str) -> None:
    if debug_artifacts is None:
        return
    output_dir = Path(debug_artifacts["_dir"])
    filename = output_dir / "error.txt"
    filename.write_text(message, encoding="utf-8")
    debug_artifacts["error"] = str(filename)


def _safe_request_id(request_id: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9_.-]", "-", request_id.strip())
    return cleaned[:64] if cleaned else "request"


def _load_image(image_bytes: bytes) -> np.ndarray:
    if not _CV2_AVAILABLE or not _NUMPY_AVAILABLE:
        raise ImportError("opencv is required for OCR preprocessing")
    buffer = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(buffer, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("invalid image bytes")
    return image


def _safe_crop(image: np.ndarray) -> tuple[np.ndarray, str | None]:
    cropped = _crop_by_contour(image)
    if cropped is not None:
        return cropped, "contour"
    cropped = _border_crop(image)
    if cropped is not None:
        return cropped, "border"
    return image, None


def _crop_by_contour(image: np.ndarray) -> np.ndarray | None:
    if not _CV2_AVAILABLE:
        return None
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 150)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None
    largest = max(contours, key=cv2.contourArea)
    area = cv2.contourArea(largest)
    height, width = gray.shape
    image_area = float(height * width)
    if image_area <= 0:
        return None
    ratio = area / image_area
    if ratio < 0.5 or ratio > 0.98:
        return None
    x, y, w, h = cv2.boundingRect(largest)
    if w < width * 0.5 or h < height * 0.5:
        return None
    pad = int(0.02 * min(height, width))
    x0 = max(x - pad, 0)
    y0 = max(y - pad, 0)
    x1 = min(x + w + pad, width)
    y1 = min(y + h + pad, height)
    if x0 == 0 and y0 == 0 and x1 == width and y1 == height:
        return None
    return image[y0:y1, x0:x1]


def _border_crop(image: np.ndarray) -> np.ndarray | None:
    if not _CV2_AVAILABLE or not _NUMPY_AVAILABLE:
        return None
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    height, width = gray.shape
    margin = int(0.02 * min(height, width))
    if margin < 4:
        return None
    top = gray[:margin, :].ravel()
    bottom = gray[height - margin :, :].ravel()
    left = gray[:, :margin].ravel()
    right = gray[:, width - margin :].ravel()
    border = np.concatenate([top, bottom, left, right])
    if border.size == 0:
        return None
    if float(border.std()) < 12.0 and float(border.mean()) > 200.0:
        return image[margin : height - margin, margin : width - margin]
    return None


def _rotate_image(image: np.ndarray, angle: int) -> np.ndarray:
    if not _CV2_AVAILABLE:
        return image
    if angle == 90:
        return cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE)
    if angle == 180:
        return cv2.rotate(image, cv2.ROTATE_180)
    if angle == 270:
        return cv2.rotate(image, cv2.ROTATE_90_COUNTERCLOCKWISE)
    return image


def _resize_to_target(
    image: np.ndarray, min_dim_target: int, max_side: int
) -> tuple[np.ndarray, str | None]:
    if not _CV2_AVAILABLE:
        return image, None
    height, width = image.shape[:2]
    if height == 0 or width == 0:
        return image, None
    min_dim = min(height, width)
    max_dim = max(height, width)
    scale = 1.0
    if min_dim < min_dim_target:
        scale = min_dim_target / float(min_dim)
    if max_dim * scale > max_side:
        scale = max_side / float(max_dim)
    if abs(scale - 1.0) < 0.01:
        return image, None
    new_w = max(1, int(round(width * scale)))
    new_h = max(1, int(round(height * scale)))
    interpolation = cv2.INTER_CUBIC if scale > 1.0 else cv2.INTER_AREA
    resized = cv2.resize(image, (new_w, new_h), interpolation=interpolation)
    return resized, f"resize:{new_w}x{new_h}"


def _binarize_image(image: np.ndarray) -> np.ndarray:
    if not _CV2_AVAILABLE or not _NUMPY_AVAILABLE:
        return image
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    white_ratio = float(np.mean(thresh == 255)) if thresh.size else 0.0
    if white_ratio < 0.1 or white_ratio > 0.9:
        thresh = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 2
        )
    return cv2.cvtColor(thresh, cv2.COLOR_GRAY2BGR)


def _select_best_rotation(
    engine: Any, image: np.ndarray, check_timeout: callable
) -> int:
    preview = _resize_preview(image, 900)
    best_angle = 0
    best_score = (-1, -1.0, -1)
    for angle in (0, 90, 180, 270):
        check_timeout()
        rotated = _rotate_image(preview, angle)
        lines, _, _ = _run_ocr(engine, rotated, check_timeout)
        score = _score_ocr_lines(lines)
        if score > best_score:
            best_score = score
            best_angle = angle
    return best_angle


def _resize_preview(image: np.ndarray, max_side: int) -> np.ndarray:
    if not _CV2_AVAILABLE:
        return image
    height, width = image.shape[:2]
    if max(height, width) <= max_side:
        return image
    scale = max_side / float(max(height, width))
    new_w = max(1, int(round(width * scale)))
    new_h = max(1, int(round(height * scale)))
    return cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)


def _run_two_pass_ocr(
    engine: Any,
    image: np.ndarray,
    settings: _OcrSettings,
    check_timeout: callable,
) -> _TwoPassResult:
    if not _CV2_AVAILABLE or not _NUMPY_AVAILABLE:
        return _TwoPassResult([], "", False, [], 0, 0, [], "", [])

    steps: list[str] = []
    pass1_start = time.monotonic()
    pass1_image, scale_x, scale_y, resize_tag = _downscale_for_pass1(
        image, settings.pass1_max_side
    )
    if resize_tag:
        steps.append(f"pass1:{resize_tag}")
    pass1_kwargs = {
        "text_det_limit_side_len": min(settings.pass1_max_side, 640),
        "text_det_limit_type": "max",
        "text_rec_score_thresh": 0.0,
        "use_doc_orientation_classify": False,
        "use_doc_unwarping": False,
        "use_textline_orientation": False,
    }
    pass1_lines, pass1_text, _ = _run_ocr(
        engine, pass1_image, check_timeout, pass1_kwargs
    )
    steps.append("pass1:ocr")
    pass1_ms = int(round((time.monotonic() - pass1_start) * 1000))
    if not pass1_lines:
        return _TwoPassResult([], "", False, steps, pass1_ms, 0, [], "", [])

    pass1_scaled = _scale_lines(pass1_lines, scale_x, scale_y)
    anchors = _find_anchor_lines(pass1_scaled)
    rois_by_anchor = _derive_rois_by_anchor(anchors, image.shape, settings.roi_padding)
    rois = []
    for key in ("nik", "name"):
        rois.extend(rois_by_anchor.get(key, []))
    rois = _dedupe_rois(rois)
    if not rois:
        return _TwoPassResult(
            [], "", False, steps, pass1_ms, 0, pass1_scaled, pass1_text, []
        )

    steps.append(f"pass2:roi:{len(rois)}")
    roi_lines: list[dict] = []
    used_binarize = False
    pass2_start = time.monotonic()
    roi_attempts = 0
    pass2_kwargs = {
        "text_det_limit_side_len": min(
            settings.roi_max_side, max(640, settings.pass1_max_side)
        ),
        "text_det_limit_type": "max",
        "text_rec_score_thresh": 0.0,
        "use_doc_orientation_classify": False,
        "use_doc_unwarping": False,
        "use_textline_orientation": False,
    }
    for key in ("nik", "name"):
        candidates = rois_by_anchor.get(key, [])
        for roi in candidates:
            roi_image = _crop_roi(image, roi)
            if roi_image is None:
                continue
            roi_image, roi_resize_tag = _downscale_roi(roi_image, settings.roi_max_side)
            if roi_resize_tag:
                steps.append(f"pass2:{roi_resize_tag}")
            roi_attempts += 1
            lines, _, _ = _run_ocr(engine, roi_image, check_timeout, pass2_kwargs)
            if lines:
                roi_lines.extend(_offset_lines(lines, roi))
            if _roi_has_field(key, lines):
                break
            if settings.enable_binarize:
                binarized = _binarize_image(roi_image)
                bin_lines, _, _ = _run_ocr(
                    engine, binarized, check_timeout, pass2_kwargs
                )
                if bin_lines:
                    roi_lines.extend(_offset_lines(bin_lines, roi))
                    used_binarize = True
                if _roi_has_field(key, bin_lines):
                    break

    if roi_attempts:
        steps.append("pass2:ocr")
    pass2_ms = int(round((time.monotonic() - pass2_start) * 1000))
    if used_binarize:
        steps.append("binarize:pass2")
    if not roi_lines:
        return _TwoPassResult(
            [], "", False, steps, pass1_ms, pass2_ms, pass1_scaled, pass1_text, []
        )

    combined = _merge_lines(pass1_scaled, roi_lines)
    text = "\n".join(line["text"] for line in combined if line.get("text"))
    return _TwoPassResult(
        combined,
        text,
        used_binarize,
        steps,
        pass1_ms,
        pass2_ms,
        pass1_scaled,
        pass1_text,
        roi_lines,
    )


def _run_best_ocr(
    engine: Any,
    image: np.ndarray,
    settings: _OcrSettings,
    debug_artifacts: dict | None,
    check_timeout: callable,
    debug_key: str | None = "binarized",
) -> tuple[list[dict], str, bool]:
    normal_lines, normal_text, _ = _run_ocr(engine, image, check_timeout)
    best_lines = normal_lines
    best_text = normal_text
    best_score = _score_ocr_lines(normal_lines)
    selected_binarized = False

    if settings.enable_binarize:
        binarized = _binarize_image(image)
        if debug_artifacts is not None and debug_key:
            _write_debug_image(debug_artifacts, debug_key, binarized)
        bin_lines, bin_text, _ = _run_ocr(engine, binarized, check_timeout)
        bin_score = _score_ocr_lines(bin_lines)
        if bin_score > best_score:
            best_lines = bin_lines
            best_text = bin_text
            best_score = bin_score
            selected_binarized = True
    return best_lines, best_text, selected_binarized


def _run_ocr(
    engine: Any,
    image: np.ndarray,
    check_timeout: callable,
    ocr_kwargs: dict | None = None,
) -> tuple[list[dict], str, float]:
    check_timeout()
    try:
        if ocr_kwargs:
            result = engine.ocr(image, **ocr_kwargs)
        else:
            result = engine.ocr(image, cls=False)
    except TypeError:
        logger.debug("OCR engine.ocr TypeError with cls flag, retrying without cls")
        result = engine.ocr(image, **(ocr_kwargs or {}))
    lines = _normalize_ocr_lines(result)
    text = "\n".join(line["text"] for line in lines if line["text"])
    avg_conf = _average_conf(lines)
    return lines, text, avg_conf


def _normalize_ocr_lines(result: Any) -> list[dict]:
    if result is None:
        return []
    if not isinstance(result, list):
        try:
            if isinstance(result, (str, bytes)):
                return []
            result = list(result)
        except Exception as exc:
            logger.debug("OCR normalize lines failed to coerce iterable: %s", exc)
            result = [result]
    if not result:
        return []

    paddlex_item = _coerce_paddlex_item(result[0])
    if paddlex_item is not None:
        paddlex_item = _unwrap_paddlex_result(paddlex_item)
        if "rec_texts" in paddlex_item:
            return _lines_from_paddlex(paddlex_item)

    if isinstance(result[0], dict) and ("rec_texts" in result[0]):
        return _lines_from_paddlex(result[0])

    def is_line(item: Any) -> bool:
        return (
            isinstance(item, (list, tuple))
            and len(item) == 2
            and isinstance(item[0], (list, tuple))
            and isinstance(item[1], (list, tuple))
            and len(item[1]) >= 1
        )

    def is_dict_line(item: Any) -> bool:
        return isinstance(item, dict) and (
            any(
                key in item
                for key in (
                    "text",
                    "rec_text",
                    "transcription",
                    "label",
                    "value",
                    "bbox",
                    "box",
                    "points",
                    "poly",
                    "polys",
                )
            )
        )

    if len(result) == 1 and isinstance(result[0], list) and result[0]:
        if all(is_line(item) or is_dict_line(item) for item in result[0]):
            lines = result[0]
        else:
            lines = result
    else:
        lines = result

    if not lines:
        return []

    normalized: list[dict] = []
    for item in lines:
        if not is_line(item):
            if isinstance(item, dict):
                mapped = _line_from_mapping(item)
                if mapped is not None:
                    normalized.append(mapped)
            continue
        bbox, payload = item
        text = payload[0] if payload else ""
        conf = float(payload[1]) if len(payload) > 1 else 0.0
        normalized.append(
            {
                "text": str(text) if text is not None else "",
                "conf": conf,
                "bbox": _normalize_bbox(bbox),
            }
        )
    return normalized


def _line_from_mapping(item: dict) -> dict | None:
    if not item:
        return None
    text = (
        item.get("text")
        or item.get("rec_text")
        or item.get("transcription")
        or item.get("label")
        or item.get("value")
        or ""
    )
    conf = (
        item.get("conf")
        if item.get("conf") is not None
        else item.get("score")
        if item.get("score") is not None
        else item.get("confidence")
        if item.get("confidence") is not None
        else item.get("rec_score")
    )
    bbox = (
        item.get("bbox")
        or item.get("box")
        or item.get("points")
        or item.get("poly")
        or item.get("polys")
        or item.get("rec_poly")
        or item.get("rec_polys")
    )
    normalized_bbox = _normalize_bbox(bbox)
    if not text and not normalized_bbox:
        return None
    try:
        conf_value = float(conf) if conf is not None else 0.0
    except Exception as exc:
        logger.debug("OCR line mapping failed to parse confidence: %s", exc)
        conf_value = 0.0
    return {
        "text": str(text) if text is not None else "",
        "conf": conf_value,
        "bbox": normalized_bbox,
    }


def _coerce_paddlex_item(item: Any) -> dict | None:
    if isinstance(item, dict):
        return item
    if hasattr(item, "get"):
        try:
            data = {
                "rec_texts": item.get("rec_texts"),
                "rec_scores": item.get("rec_scores"),
                "rec_polys": item.get("rec_polys"),
                "dt_polys": item.get("dt_polys"),
                "rec_boxes": item.get("rec_boxes"),
            }
            if any(value is not None for value in data.values()):
                return data
        except Exception as exc:
            logger.debug("OCR paddlex item get failed: %s", exc)
            pass
    if hasattr(item, "json"):
        try:
            data = item.json
            if isinstance(data, dict):
                return data
        except Exception as exc:
            logger.debug("OCR paddlex item json parse failed: %s", exc)
            return None
    if hasattr(item, "_to_json"):
        try:
            data = item._to_json()  # type: ignore[attr-defined]
            if isinstance(data, dict):
                return data
        except Exception as exc:
            logger.debug("OCR paddlex item _to_json failed: %s", exc)
            return None
    return None


def _unwrap_paddlex_result(item: dict) -> dict:
    if "res" in item and isinstance(item["res"], dict):
        return item["res"]
    if "result" in item and isinstance(item["result"], dict):
        return item["result"]
    return item


def _lines_from_paddlex(data: dict) -> list[dict]:
    texts = _as_list(data.get("rec_texts"))
    scores = _as_list(data.get("rec_scores"))
    polys = (
        _as_list(data.get("rec_polys"))
        or _as_list(data.get("dt_polys"))
        or _as_list(data.get("rec_boxes"))
    )
    lines: list[dict] = []
    for idx, raw_text in enumerate(texts):
        text = ""
        conf = 0.0
        if isinstance(raw_text, (list, tuple)):
            if raw_text:
                text = str(raw_text[0])
            if len(raw_text) > 1:
                try:
                    conf = float(raw_text[1])
                except Exception as exc:
                    logger.debug(
                        "OCR paddlex raw_text confidence parse failed: %s", exc
                    )
                    conf = 0.0
        else:
            text = str(raw_text) if raw_text is not None else ""
        if scores and idx < len(scores):
            try:
                conf = float(scores[idx])
            except Exception as exc:
                logger.debug("OCR paddlex score parse failed: %s", exc)
                pass
        bbox = []
        if polys and idx < len(polys):
            bbox = _normalize_bbox(polys[idx])
        if text or bbox:
            lines.append({"text": text, "conf": conf, "bbox": bbox})
    return lines


def _as_list(value: Any) -> list:
    if value is None:
        return []
    if hasattr(value, "tolist"):
        try:
            value = value.tolist()
        except Exception as exc:
            logger.debug("OCR as_list failed to tolist(): %s", exc)
            pass
    if isinstance(value, list):
        return value
    if isinstance(value, tuple):
        return list(value)
    return [value]


def _downscale_for_pass1(
    image: np.ndarray, max_side: int
) -> tuple[np.ndarray, float, float, str | None]:
    if not _CV2_AVAILABLE:
        return image, 1.0, 1.0, None
    height, width = image.shape[:2]
    if height == 0 or width == 0:
        return image, 1.0, 1.0, None
    if max(height, width) <= max_side:
        return image, 1.0, 1.0, None
    scale = max_side / float(max(height, width))
    new_w = max(1, int(round(width * scale)))
    new_h = max(1, int(round(height * scale)))
    resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
    scale_x = width / float(new_w)
    scale_y = height / float(new_h)
    return resized, scale_x, scale_y, f"downscale:{new_w}x{new_h}"


def _downscale_roi(image: np.ndarray, max_side: int) -> tuple[np.ndarray, str | None]:
    if not _CV2_AVAILABLE:
        return image, None
    height, width = image.shape[:2]
    if height == 0 or width == 0:
        return image, None
    if max(height, width) <= max_side:
        return image, None
    scale = max_side / float(max(height, width))
    new_w = max(1, int(round(width * scale)))
    new_h = max(1, int(round(height * scale)))
    resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
    return resized, f"roi-resize:{new_w}x{new_h}"


def _scale_lines(lines: Iterable[dict], scale_x: float, scale_y: float) -> list[dict]:
    if scale_x == 1.0 and scale_y == 1.0:
        return list(lines)
    scaled: list[dict] = []
    for line in lines:
        bbox = line.get("bbox") or []
        scaled_bbox = (
            [[point[0] * scale_x, point[1] * scale_y] for point in bbox] if bbox else []
        )
        scaled.append(
            {
                "text": line.get("text", ""),
                "conf": float(line.get("conf", 0.0)),
                "bbox": scaled_bbox,
            }
        )
    return scaled


def _find_anchor_lines(lines: Iterable[dict]) -> dict[str, dict]:
    anchors: dict[str, dict] = {}
    for line in lines:
        text = (line.get("text") or "").strip()
        if not text or not line.get("bbox"):
            continue
        if "nik" not in anchors and _is_anchor_nik(text):
            anchors["nik"] = line
            continue
        if "name" not in anchors and _is_anchor_name(text):
            anchors["name"] = line
    return anchors


def _normalize_anchor_text(text: str) -> str:
    cleaned = re.sub(r"[^A-Z0-9]", "", text.upper())
    cleaned = cleaned.replace("1", "I").replace("|", "I").replace("L", "I")
    cleaned = cleaned.replace("0", "O")
    return cleaned


def _is_anchor_nik(text: str) -> bool:
    if _ANCHOR_NIK_PATTERN.search(text):
        return True
    normalized = _normalize_anchor_text(text)
    return "NIK" in normalized


def _is_anchor_name(text: str) -> bool:
    if _ANCHOR_NAMA_PATTERN.search(text):
        return True
    normalized = _normalize_anchor_text(text)
    return normalized.startswith("NAMA")


def _derive_rois_from_anchors(
    anchors: dict[str, dict],
    shape: tuple[int, int, int],
    padding: int,
) -> list[tuple[int, int, int, int]]:
    rois_by_anchor = _derive_rois_by_anchor(anchors, shape, padding)
    flattened: list[tuple[int, int, int, int]] = []
    for key in ("nik", "name"):
        flattened.extend(rois_by_anchor.get(key, []))
    return _dedupe_rois(flattened)


def _derive_rois_by_anchor(
    anchors: dict[str, dict],
    shape: tuple[int, int, int],
    padding: int,
) -> dict[str, list[tuple[int, int, int, int]]]:
    height, width = shape[:2]
    rois_by_anchor: dict[str, list[tuple[int, int, int, int]]] = {}
    for key in ("nik", "name"):
        anchor = anchors.get(key)
        if not anchor:
            continue
        bbox = anchor.get("bbox") or []
        rect = _bbox_to_rect(bbox)
        if rect is None:
            continue
        x0, y0, x1, y1 = rect
        line_h = max(1, y1 - y0)
        pad = max(0, padding)
        right_roi = (
            int(x1 + pad),
            int(y0 - pad),
            int(width - pad),
            int(y1 + pad + line_h),
        )
        below_roi = (
            int(max(0, x0 - pad)),
            int(y1 - pad),
            int(width - pad),
            int(y1 + (line_h * 2) + pad),
        )
        candidates: list[tuple[int, int, int, int]] = []
        for roi in (right_roi, below_roi):
            clipped = _clip_roi(roi, width, height)
            if clipped:
                candidates.append(clipped)
        if candidates:
            rois_by_anchor[key] = candidates
    return rois_by_anchor


def _roi_has_field(field: str, lines: Iterable[dict]) -> bool:
    if field == "nik":
        value, _ = _extract_nik_from_lines(lines)
        return bool(value)
    if field == "name":
        value, _ = _extract_name_from_lines(lines)
        return bool(value)
    return False


def _bbox_to_rect(bbox: list[list[float]]) -> tuple[int, int, int, int] | None:
    if not bbox:
        return None
    xs = [point[0] for point in bbox if len(point) >= 2]
    ys = [point[1] for point in bbox if len(point) >= 2]
    if not xs or not ys:
        return None
    x0 = int(max(min(xs), 0))
    y0 = int(max(min(ys), 0))
    x1 = int(max(xs))
    y1 = int(max(ys))
    if x1 <= x0 or y1 <= y0:
        return None
    return x0, y0, x1, y1


def _clip_roi(
    roi: tuple[int, int, int, int], width: int, height: int
) -> tuple[int, int, int, int] | None:
    x0, y0, x1, y1 = roi
    x0 = max(0, min(x0, width - 1))
    y0 = max(0, min(y0, height - 1))
    x1 = max(0, min(x1, width))
    y1 = max(0, min(y1, height))
    if x1 - x0 < 20 or y1 - y0 < 20:
        return None
    return x0, y0, x1, y1


def _dedupe_rois(
    rois: list[tuple[int, int, int, int]],
) -> list[tuple[int, int, int, int]]:
    unique: list[tuple[int, int, int, int]] = []
    for roi in rois:
        if roi in unique:
            continue
        unique.append(roi)
    return unique


def _crop_roi(image: np.ndarray, roi: tuple[int, int, int, int]) -> np.ndarray | None:
    x0, y0, x1, y1 = roi
    if x1 <= x0 or y1 <= y0:
        return None
    return image[y0:y1, x0:x1]


def _offset_lines(lines: Iterable[dict], roi: tuple[int, int, int, int]) -> list[dict]:
    x0, y0, x1, y1 = roi
    updated: list[dict] = []
    for line in lines:
        bbox = line.get("bbox") or []
        if bbox:
            shifted_bbox = [[point[0] + x0, point[1] + y0] for point in bbox]
        else:
            shifted_bbox = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
        updated.append(
            {
                "text": line.get("text", ""),
                "conf": float(line.get("conf", 0.0)),
                "bbox": shifted_bbox,
            }
        )
    return updated


def _merge_lines(pass1: list[dict], pass2: list[dict]) -> list[dict]:
    return pass1 + pass2


def _normalize_bbox(bbox: Any) -> list[list[float]]:
    if isinstance(bbox, dict):
        if "points" in bbox:
            bbox = bbox.get("points")
        elif {"x1", "y1", "x2", "y2"}.issubset(bbox.keys()):
            return [
                [float(bbox["x1"]), float(bbox["y1"])],
                [float(bbox["x2"]), float(bbox["y1"])],
                [float(bbox["x2"]), float(bbox["y2"])],
                [float(bbox["x1"]), float(bbox["y2"])],
            ]
        elif {"x", "y", "w", "h"}.issubset(bbox.keys()):
            x0 = float(bbox["x"])
            y0 = float(bbox["y"])
            x1 = x0 + float(bbox["w"])
            y1 = y0 + float(bbox["h"])
            return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
    if not isinstance(bbox, (list, tuple)):
        if _NUMPY_AVAILABLE and isinstance(bbox, np.ndarray):  # type: ignore[arg-type]
            bbox = bbox.tolist()
        else:
            return []
    if bbox and all(isinstance(value, (int, float)) for value in bbox):
        if len(bbox) == 4:
            x0, y0, x1, y1 = [float(value) for value in bbox]
            return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
        if len(bbox) >= 8 and len(bbox) % 2 == 0:
            points = []
            for idx in range(0, len(bbox), 2):
                points.append([float(bbox[idx]), float(bbox[idx + 1])])
            return points
    points: list[list[float]] = []
    for point in bbox:
        if _NUMPY_AVAILABLE and isinstance(point, np.ndarray):  # type: ignore[arg-type]
            point = point.tolist()
        if isinstance(point, (list, tuple)) and len(point) >= 2:
            points.append([float(point[0]), float(point[1])])
    return points


def _average_conf(lines: Iterable[dict]) -> float:
    confs = [
        float(line.get("conf", 0.0)) for line in lines if line.get("conf") is not None
    ]
    return float(sum(confs) / len(confs)) if confs else 0.0


def _score_ocr_lines(lines: Iterable[dict]) -> tuple[int, float, int]:
    digits = 0
    meaningful = 0
    for line in lines:
        text = line.get("text", "") or ""
        digits += sum(ch.isdigit() for ch in text)
        meaningful += len(re.sub(r"\s+", "", text))
    avg_conf = _average_conf(lines)
    return digits, avg_conf, meaningful


def _extract_nik_from_lines(lines: Iterable[dict]) -> tuple[str | None, float]:
    candidates: list[tuple[str, float, float]] = []
    for line in lines:
        text = (line.get("text") or "").strip()
        if not text:
            continue
        conf = float(line.get("conf") or 0.0)
        label_bonus = 0.1 if "NIK" in text.upper() else 0.0
        for candidate in _find_nik_candidates(text):
            candidates.append((candidate, conf, label_bonus))
        if label_bonus:
            parts = re.split(r"(?i)\bNIK\b\s*[:\-]?", text, maxsplit=1)
            if len(parts) > 1:
                for candidate in _find_nik_candidates(parts[1]):
                    candidates.append((candidate, conf, 0.2))

    if not candidates:
        return None, 0.0

    best_score = -1.0
    best_candidate = None
    best_conf = 0.0
    for candidate, conf, label_bonus in candidates:
        score = _score_nik_candidate(candidate, conf, label_bonus)
        if score > best_score:
            best_score = score
            best_candidate = candidate
            best_conf = conf

    return best_candidate, best_conf


def _find_nik_candidates(text: str) -> list[str]:
    candidates: list[str] = []
    for match in re.finditer(r"\d{16}", text):
        candidates.append(match.group(0))
    for match in re.finditer(r"[0-9][0-9\s\-\.]{14,}[0-9]", text):
        digits = re.sub(r"\D", "", match.group(0))
        if len(digits) < 16:
            continue
        if len(digits) == 16:
            candidates.append(digits)
        else:
            candidates.append(digits[:16])
    unique: list[str] = []
    for candidate in candidates:
        if candidate not in unique:
            unique.append(candidate)
    return unique


def _score_nik_candidate(candidate: str, conf: float, label_bonus: float) -> float:
    score = 0.0
    if len(candidate) == 16:
        score += 60.0
    elif 15 <= len(candidate) <= 17:
        score += 30.0
    else:
        score += 10.0
    if len(set(candidate)) > 1:
        score += 5.0
    if candidate.startswith("000000"):
        score -= 5.0
    score += conf * 30.0
    score += label_bonus * 10.0
    return score


def _extract_name_from_lines(lines: Iterable[dict]) -> tuple[str | None, float]:
    lines_list = list(lines)
    for idx, line in enumerate(lines_list):
        text = (line.get("text") or "").strip()
        if not text:
            continue
        match = _NAME_LABEL_PATTERN.search(text)
        if match:
            value = _strip_label_prefix(_normalize_spaces(match.group(1)))
            if value:
                return value, float(line.get("conf") or 0.0)
            next_name = _next_non_label_line(lines_list, idx + 1)
            if next_name:
                cleaned, conf = next_name
                return _strip_label_prefix(cleaned), conf

    best_score = -1.0
    best_value = None
    best_conf = 0.0
    for line in lines_list:
        text = _strip_label_prefix(_normalize_spaces(line.get("text") or ""))
        if not text:
            continue
        if _contains_label(text):
            continue
        score = _name_quality_score(text)
        if score < 0:
            continue
        conf = float(line.get("conf") or 0.0)
        total = score + conf * 20.0
        if total > best_score:
            best_score = total
            best_value = text
            best_conf = conf

    if best_value is None:
        return None, 0.0
    return _strip_label_prefix(best_value), best_conf


def _extract_birth_place_date(
    lines: Iterable[dict], raw_text: str | None, name: str | None = None
) -> tuple[str | None, str | None]:
    lines_list = list(lines)
    for idx, line in enumerate(lines_list):
        text = (line.get("text") or "").strip()
        if not text:
            continue
        for pattern in _BIRTH_LABEL_PATTERNS:
            match = pattern.search(text)
            if not match:
                continue
            value = _normalize_spaces(match.group(1))
            place, date = _split_place_and_date(value)
            if date and (
                not place
                or _contains_label(place)
                or (name and _is_similar_name(place, name))
                or _looks_like_person_name(place)
            ):
                place = _extract_place_from_date_text(value, name)
            if date and not place:
                place = _guess_place_from_context(lines_list, idx, name)
            if place or date:
                return place, date

    place, _ = _extract_labeled_value(lines_list, _BIRTH_PLACE_LABEL_PATTERNS)
    date, _ = _extract_labeled_value(lines_list, _BIRTH_DATE_LABEL_PATTERNS)
    normalized_date = _normalize_birth_date(date) if date else None
    if normalized_date and not place:
        place = _extract_place_from_date_text(date, name)
        if not place:
            place = _guess_place_from_context(
                lines_list,
                _line_index_for_label(lines_list, _BIRTH_DATE_LABEL_PATTERNS),
                name,
            )
    if place or normalized_date:
        return _clean_place(place), normalized_date

    for text in _iter_text_candidates(lines_list, raw_text):
        place, date = _split_place_and_date(text)
        if date:
            if not place:
                place = _extract_place_from_date_text(text, name)
            if not place:
                place = _guess_place_from_context(
                    lines_list, _find_line_index(lines_list, text), name
                )
            return place, date

    return None, None


def _line_index_for_label(
    lines: list[dict], patterns: tuple[re.Pattern, ...]
) -> int | None:
    for idx, line in enumerate(lines):
        text = (line.get("text") or "").strip()
        if not text:
            continue
        if any(pattern.search(text) for pattern in patterns):
            return idx
    return None


def _find_line_index(lines: list[dict], text: str) -> int | None:
    target = _normalize_spaces(text)
    for idx, line in enumerate(lines):
        if _normalize_spaces(line.get("text") or "") == target:
            return idx
    return None


def _guess_place_from_context(
    lines: list[dict], idx: int | None, name: str | None
) -> str | None:
    if idx is None:
        return None
    candidates: list[str] = []
    for offset in (-2, -1, 1, 2):
        neighbor_idx = idx + offset
        if neighbor_idx < 0 or neighbor_idx >= len(lines):
            continue
        text = _normalize_spaces(lines[neighbor_idx].get("text") or "")
        if not text:
            continue
        if _contains_label(text):
            continue
        if any(ch.isdigit() for ch in text):
            continue
        if name and _is_similar_name(text, name):
            continue
        if _looks_like_person_name(text):
            continue
        score = _place_quality_score(text)
        if score > 0:
            candidates.append(text)
    if not candidates:
        return None
    best = max(candidates, key=_place_quality_score)
    return _clean_place(best)


def _place_quality_score(text: str) -> float:
    if len(text) < 3 or len(text) > 60:
        return 0.0
    letters = sum(ch.isalpha() or ch in " .'-" for ch in text)
    ratio = letters / float(len(text)) if text else 0.0
    if ratio < 0.7:
        return 0.0
    return ratio * 100.0 + min(len(text), 30)


def _is_similar_name(text: str, name: str) -> bool:
    candidate = _normalize_spaces(text).upper()
    reference = _normalize_spaces(name).upper()
    if not candidate or not reference:
        return False
    if candidate == reference:
        return True
    ratio = SequenceMatcher(None, candidate, reference).ratio()
    return ratio >= 0.8


def _looks_like_person_name(text: str) -> bool:
    words = [w for w in _normalize_spaces(text).split(" ") if w]
    if len(words) < 3:
        return False
    if not all(word.isalpha() for word in words):
        return False
    upper = text.upper()
    if any(
        token in upper
        for token in (
            "KOTA",
            "KAB",
            "KABUPATEN",
            "PROV",
            "PROVINSI",
            "KEC",
            "KECAMATAN",
            "DESA",
            "KEL",
            "KELURAHAN",
        )
    ):
        return False
    return True


def _extract_gender(lines: Iterable[dict], raw_text: str | None) -> str | None:
    lines_list = list(lines)
    value, _ = _extract_labeled_value(lines_list, _GENDER_LABEL_PATTERNS)
    normalized = _normalize_gender(value)
    if normalized:
        return normalized
    for text in _iter_text_candidates(lines_list, raw_text):
        normalized = _normalize_gender(text)
        if normalized:
            return normalized
    return None


def _extract_religion(lines: Iterable[dict], raw_text: str | None) -> str | None:
    lines_list = list(lines)
    value, _ = _extract_labeled_value(lines_list, _RELIGION_LABEL_PATTERNS)
    normalized = _normalize_religion(value)
    if normalized:
        return normalized
    for text in _iter_text_candidates(lines_list, raw_text):
        normalized = _normalize_religion(text)
        if normalized:
            return normalized
    return None


def _extract_labeled_value(
    lines: list[dict], patterns: tuple[re.Pattern, ...]
) -> tuple[str | None, float]:
    for idx, line in enumerate(lines):
        text = (line.get("text") or "").strip()
        if not text:
            continue
        for pattern in patterns:
            match = pattern.search(text)
            if not match:
                continue
            value = _normalize_spaces(match.group(1))
            if value:
                return _strip_label_prefix(value), float(line.get("conf") or 0.0)
            next_value = _next_non_label_line(lines, idx + 1)
            if next_value and next_value[0]:
                return next_value[0], next_value[1]
    return None, 0.0


def _iter_text_candidates(lines: Iterable[dict], raw_text: str | None) -> Iterable[str]:
    yielded: set[str] = set()
    for line in lines:
        text = _normalize_spaces(line.get("text") or "")
        if text and text not in yielded:
            yielded.add(text)
            yield text
    if raw_text:
        for text in raw_text.splitlines():
            cleaned = _normalize_spaces(text)
            if cleaned and cleaned not in yielded:
                yielded.add(cleaned)
                yield cleaned


def _split_place_and_date(value: str | None) -> tuple[str | None, str | None]:
    if not value:
        return None, None
    cleaned = _normalize_spaces(value)
    cleaned = _strip_label_prefix(cleaned)
    normalized_date, span = _extract_date_from_text(cleaned)
    place = None
    if span:
        before = cleaned[: span[0]].strip(" ,:-")
        after = cleaned[span[1] :].strip(" ,:-")
        if before:
            place = before
        elif after:
            place = after
    elif cleaned and not _contains_label(cleaned):
        place = cleaned
    return _clean_place(place), normalized_date


def _extract_place_from_date_text(text: str | None, name: str | None) -> str | None:
    if not text:
        return None
    cleaned = _normalize_spaces(text)
    match = _DATE_PATTERN.search(cleaned)
    if not match:
        return None
    before = cleaned[: match.start()].strip()
    candidates: list[str] = []
    if ":" in before:
        candidates.append(before.split(":")[-1])
    if "," in before:
        candidates.append(before.split(",")[0])
    candidates.append(before)
    for candidate in candidates:
        candidate = _strip_birth_label_tokens(candidate)
        candidate = _clean_place(candidate)
        if not candidate:
            continue
        if _contains_label(candidate):
            continue
        if name and _is_similar_name(candidate, name):
            continue
        if _looks_like_person_name(candidate):
            continue
        return candidate
    return None


def _strip_birth_label_tokens(text: str) -> str:
    cleaned = text
    cleaned = re.sub(r"(?i)\\bTEMPAT\\b", " ", cleaned)
    cleaned = re.sub(r"(?i)\\bTGL\\b", " ", cleaned)
    cleaned = re.sub(r"(?i)\\bLAHIR\\b", " ", cleaned)
    cleaned = re.sub(r"(?i)\\bTTL\\b", " ", cleaned)
    cleaned = cleaned.replace("/", " ")
    cleaned = cleaned.replace(":", " ")
    return _normalize_spaces(cleaned)


def _extract_date_from_text(text: str) -> tuple[str | None, tuple[int, int] | None]:
    match = _DATE_PATTERN.search(text)
    if not match:
        return None, None
    day = int(match.group(1))
    month = int(match.group(2))
    year = int(match.group(3))
    normalized = _normalize_birth_date_values(day, month, year)
    if not normalized:
        return None, None
    return normalized, match.span()


def _normalize_birth_date(value: str | None) -> str | None:
    if not value:
        return None
    normalized, _ = _extract_date_from_text(value)
    return normalized


def _normalize_birth_date_values(day: int, month: int, year: int) -> str | None:
    if year < 100:
        year = 1900 + year if year >= 30 else 2000 + year
    if month < 1 or month > 12 or day < 1 or day > 31:
        return None
    return f"{year:04d}-{month:02d}-{day:02d}"


def _clean_place(value: str | None) -> str | None:
    if not value:
        return None
    cleaned = re.sub(r"[^0-9A-Za-z\s.'-]", " ", value)
    cleaned = _normalize_spaces(cleaned)
    return cleaned or None


def _normalize_gender(value: str | None) -> str | None:
    if not value:
        return None
    normalized = _normalize_token(value)
    if not normalized:
        return None
    if "PEREM" in normalized or "WANITA" in normalized:
        return _GENDER_CANONICAL["PEREMPUAN"]
    if "LAKI" in normalized or "PRIA" in normalized:
        return _GENDER_CANONICAL["LAKI-LAKI"]
    best = _best_fuzzy_match(normalized, _GENDER_CANONICAL.keys(), 0.6)
    if best:
        return _GENDER_CANONICAL[best]
    return None


def _normalize_religion(value: str | None) -> str | None:
    if not value:
        return None
    normalized = _normalize_token(value)
    if not normalized:
        return None
    if normalized in _RELIGION_ALIASES:
        normalized = _RELIGION_ALIASES[normalized]
    if normalized in _RELIGION_CANONICAL:
        return _RELIGION_CANONICAL[normalized]
    for canonical in _RELIGION_CANONICAL.keys():
        if canonical in normalized:
            return _RELIGION_CANONICAL[canonical]
    best = _best_fuzzy_match(normalized, _RELIGION_CANONICAL.keys(), 0.65)
    if best:
        return _RELIGION_CANONICAL[best]
    return None


def _normalize_token(value: str) -> str:
    cleaned = value.upper()
    cleaned = cleaned.replace("0", "O").replace("1", "I").replace("|", "I")
    cleaned = re.sub(r"[^A-Z]", "", cleaned)
    return cleaned


def _best_fuzzy_match(
    value: str, choices: Iterable[str], threshold: float
) -> str | None:
    best_choice = None
    best_ratio = threshold
    for choice in choices:
        ratio = SequenceMatcher(None, value, choice).ratio()
        if ratio > best_ratio:
            best_ratio = ratio
            best_choice = choice
    return best_choice


def _next_non_label_line(lines: list[dict], start: int) -> tuple[str | None, float]:
    for line in lines[start:]:
        text = _strip_label_prefix(_normalize_spaces(line.get("text") or ""))
        if not text:
            continue
        if _contains_label(text):
            return None, 0.0
        score = _name_quality_score(text)
        if score >= 0:
            return text, float(line.get("conf") or 0.0)
    return None, 0.0


def _contains_label(text: str) -> bool:
    upper = text.upper()
    for label in _KNOWN_LABELS:
        if label in upper:
            return True
    return False


def _name_quality_score(text: str) -> float:
    if len(text) < 3 or len(text) > 60:
        return -1.0
    letters = sum(ch.isalpha() or ch in " .'-" for ch in text)
    ratio = letters / float(len(text)) if text else 0.0
    if ratio < 0.7:
        return -1.0
    length_score = min(len(text), 40) / 40.0
    return ratio * 70.0 + length_score * 30.0


def _normalize_spaces(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _strip_label_prefix(text: str) -> str:
    cleaned = re.sub(r"^[\\s:;\\-]+", "", text)
    cleaned = re.sub(r"(?i)^nama\\b\\s*[:\\-]?\\s*", "", cleaned)
    return cleaned.strip()


def _score_nik(nik: str | None, nik_conf: float, ground_truth: dict | None) -> int:
    if ground_truth and ground_truth.get("nik"):
        return _score_with_ground_truth(nik, ground_truth.get("nik"), digits_only=True)
    if not nik:
        return 0
    score = 0.0
    if len(nik) == 16:
        score += 60.0
    elif 15 <= len(nik) <= 17:
        score += 35.0
    else:
        score += 10.0
    if len(set(nik)) <= 2:
        score -= 10.0
    score += nik_conf * 30.0
    return _clamp_score(score)


def _score_name(name: str | None, name_conf: float, ground_truth: dict | None) -> int:
    if ground_truth and ground_truth.get("name"):
        return _score_with_ground_truth(
            name, ground_truth.get("name"), digits_only=False
        )
    if not name:
        return 0
    quality = _name_quality_score(name)
    if quality < 0:
        return 0
    score = quality * 0.7 + name_conf * 30.0
    return _clamp_score(score)


def _score_with_ground_truth(
    prediction: str | None, truth: str, *, digits_only: bool
) -> int:
    if not prediction or not truth:
        return 0
    try:
        from rapidfuzz import fuzz as rf_fuzz

        scorer = rf_fuzz.ratio
    except Exception as exc:  # pragma: no cover - fallback
        logger.warning("OCR similarity uses fallback matcher: %s", exc)
        try:
            from fuzzywuzzy import fuzz as rf_fuzz

            scorer = rf_fuzz.ratio
        except Exception as exc:
            logger.warning("OCR similarity matcher unavailable: %s", exc)
            return 0

    pred = prediction
    gt = truth
    if digits_only:
        pred = re.sub(r"\D", "", pred)
        gt = re.sub(r"\D", "", gt)
    else:
        pred = _normalize_spaces(pred).upper()
        gt = _normalize_spaces(gt).upper()
    return int(round(float(scorer(pred, gt))))


def _clamp_score(value: float) -> int:
    return int(max(0, min(100, round(value))))


def _build_result(
    *,
    nik: str | None,
    name: str | None,
    nik_score: int,
    name_score: int,
    ocr_time_ms: int,
    steps: list[str],
    raw_lines: list[dict],
    raw_text: str,
    debug_artifacts: dict | None,
) -> dict:
    result = {
        "nik": nik,
        "name": name,
        "nik_score": nik_score,
        "name_score": name_score,
        "ocr_time_ms": ocr_time_ms,
        "preprocessing_steps_applied": steps,
        "raw_ocr_lines": raw_lines,
        "raw_ocr_text": raw_text,
        "debug_artifacts": debug_artifacts if debug_artifacts is not None else None,
    }
    if debug_artifacts is not None:
        result["debug_artifacts"] = {
            key: value for key, value in debug_artifacts.items() if key != "_dir"
        }
    return result


def _build_error_result(
    start_time: float, steps: list[str], debug_artifacts: dict | None
) -> dict:
    return _build_result(
        nik=None,
        name=None,
        nik_score=0,
        name_score=0,
        ocr_time_ms=_elapsed_ms(start_time),
        steps=steps,
        raw_lines=[],
        raw_text="",
        debug_artifacts=debug_artifacts,
    )


def _elapsed_ms(start_time: float) -> int:
    return int(round((time.monotonic() - start_time) * 1000))


def _get_ocr_engine(settings: _OcrSettings) -> Any:
    global _PADDLE_OCR_ENGINE, _PADDLE_OCR_INIT_LOGGED
    if _PADDLE_OCR_ENGINE is not None:
        logger.debug("OCR engine reuse")
        return _PADDLE_OCR_ENGINE
    with _PADDLE_OCR_LOCK:
        if _PADDLE_OCR_ENGINE is None:
            logger.info(
                "OCR engine initializing device=%s lang=%s",
                "gpu" if settings.use_gpu else "cpu",
                settings.lang,
            )
            init_start = time.monotonic()
            _PADDLE_OCR_ENGINE = _create_paddle_ocr(settings)
            init_ms = int(round((time.monotonic() - init_start) * 1000))
            if not _PADDLE_OCR_INIT_LOGGED:
                _PADDLE_OCR_INIT_LOGGED = True
                logger.info("OCR engine initialized time_engine_init_ms=%s", init_ms)
    return _PADDLE_OCR_ENGINE


def _create_paddle_ocr(settings: _OcrSettings) -> Any:
    from paddleocr import PaddleOCR

    device = "gpu" if settings.use_gpu else "cpu"
    primary_kwargs = {
        "device": device,
        "lang": settings.lang,
        "use_textline_orientation": False,
        "use_doc_orientation_classify": False,
        "use_doc_unwarping": False,
    }
    try:
        logger.debug("OCR engine init primary")
        return PaddleOCR(**primary_kwargs)
    except (TypeError, ValueError):
        logger.warning("OCR engine primary init failed, falling back")
        pass

    fallback_kwargs = {
        "device": device,
        "lang": settings.lang,
        "use_angle_cls": False,
    }
    try:
        logger.debug("OCR engine init fallback")
        return PaddleOCR(**fallback_kwargs)
    except (TypeError, ValueError):
        logger.warning("OCR engine fallback init failed, using legacy options")
        pass

    legacy_kwargs = {
        "use_gpu": settings.use_gpu,
        "lang": settings.lang,
        "use_angle_cls": False,
    }
    logger.debug("OCR engine init legacy")
    return PaddleOCR(**legacy_kwargs)


def _reset_ocr_engine_for_tests() -> None:
    global _PADDLE_OCR_ENGINE
    _PADDLE_OCR_ENGINE = None


def _log_call(fn):
    if getattr(fn, "_ocr_log_wrapped", False):
        return fn

    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        logger.debug("ocr_service.%s called", fn.__name__)
        try:
            result = fn(*args, **kwargs)
            logger.debug("ocr_service.%s completed", fn.__name__)
            return result
        except Exception as exc:  # pragma: no cover - defensive
            logger.exception("ocr_service.%s failed: %s", fn.__name__, exc)
            raise

    wrapper._ocr_log_wrapped = True  # type: ignore[attr-defined]
    return wrapper


def _wrap_functions_for_logging() -> None:
    for name, obj in list(globals().items()):
        if name in {"_log_call", "_wrap_functions_for_logging"}:
            continue
        if inspect.isfunction(obj) and obj.__module__ == __name__:
            if getattr(obj, "_ocr_log_wrapped", False):
                continue
            globals()[name] = _log_call(obj)


_wrap_functions_for_logging()
