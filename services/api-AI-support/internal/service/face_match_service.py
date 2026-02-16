from __future__ import annotations

import importlib
import importlib.util
import logging
import threading
import time
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import Any
from uuid import uuid4

from pkg.types.config import AppConfig

from internal.infrastructure.ai.insightface_embedder import (
    InsightFaceAnalyzer,
    select_best_face,
)
from internal.infrastructure.http.media_client import MediaStorageClient

logger = logging.getLogger(__name__)

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


@dataclass(frozen=True)
class _FaceSettings:
    model_pack: str
    max_image_side: int
    max_upload_bytes: int
    ktp_min_area_ratio: float
    min_area_ratio_selfie: float
    min_blur_ktp: float
    min_blur_selfie: float
    brightness_min: float
    brightness_max: float
    upscale_threshold: float
    min_face_size: int
    similarity_clamp: bool
    allow_multi_select: bool
    debug_dir: Path
    match_threshold: float


_FACE_SETTINGS: _FaceSettings | None = None
_FACE_SETTINGS_LOCK = threading.Lock()

_FACE_ANALYZER: InsightFaceAnalyzer | None = None
_FACE_ANALYZER_LOCK = threading.Lock()

_MEDIA_CLIENT: MediaStorageClient | None = None
_MEDIA_CLIENT_LOCK = threading.Lock()


STATUS_OK = "OK"
STATUS_NO_FACE = "NO_FACE"
STATUS_MULTIPLE = "MULTIPLE_FACES"
STATUS_LOW_QUALITY = "LOW_QUALITY"
STATUS_ERROR = "ERROR"

REASON_TOO_SMALL = "FACE_TOO_SMALL"
REASON_TOO_BLURRY = "FACE_TOO_BLURRY"
REASON_TOO_DARK = "FACE_TOO_DARK"
REASON_TOO_BRIGHT = "FACE_TOO_BRIGHT"


def match_face_ktp_selfie(
    ktp_image_bytes: bytes,
    selfie_image_bytes: bytes,
    *,
    request_id: str | None = None,
    debug: bool = False,
    metadata: dict | None = None,
) -> dict:
    settings = _load_face_settings()
    request_id = request_id or _safe_request_id()
    if not _NUMPY_AVAILABLE:
        raise ValueError("NUMPY_NOT_AVAILABLE")
    if not _CV2_AVAILABLE:
        raise ValueError("CV2_NOT_AVAILABLE")
    logger.info(
        "Face match pipeline start request_id=%s bytes_ktp=%s bytes_selfie=%s debug=%s threshold=%s",
        request_id,
        len(ktp_image_bytes) if ktp_image_bytes else 0,
        len(selfie_image_bytes) if selfie_image_bytes else 0,
        debug,
        settings.match_threshold,
    )
    if metadata:
        logger.debug(
            "Face match metadata request_id=%s keys=%s",
            request_id,
            list(metadata.keys()),
        )

    start = time.monotonic()
    debug_artifacts: dict | None = None
    ktp_media_ref = None
    selfie_media_ref = None

    try:
        _validate_bytes(ktp_image_bytes, settings.max_upload_bytes)
        _validate_bytes(selfie_image_bytes, settings.max_upload_bytes)

        media_client = _get_media_client()
        ktp_mime = _detect_image_mime(ktp_image_bytes)
        selfie_mime = _detect_image_mime(selfie_image_bytes)
        ktp_media = media_client.upload_bytes(
            ktp_image_bytes,
            filename=_build_filename("ktp", ktp_mime),
            mime_type=ktp_mime,
        )
        selfie_media = media_client.upload_bytes(
            selfie_image_bytes,
            filename=_build_filename("selfie", selfie_mime),
            mime_type=selfie_mime,
        )
        ktp_media_ref = ktp_media.get("url") or ktp_media.get("id")
        selfie_media_ref = selfie_media.get("url") or selfie_media.get("id")

        ktp_image = _decode_image(ktp_image_bytes)
        selfie_image = _decode_image(selfie_image_bytes)

        ktp_proc, _ = _downscale_to_max_side(ktp_image, settings.max_image_side)
        selfie_proc, _ = _downscale_to_max_side(selfie_image, settings.max_image_side)

        if debug:
            debug_artifacts = _init_debug_artifacts(settings, request_id)
            _write_debug_image(debug_artifacts, "ktp_original", ktp_image)
            _write_debug_image(debug_artifacts, "selfie_original", selfie_image)

        analyzer = _get_face_analyzer()
        detect_start = time.monotonic()
        ktp_faces = analyzer.detect(ktp_proc)
        selfie_faces = analyzer.detect(selfie_proc)
        detection_ms = _elapsed_ms(detect_start)

        ktp_info = _build_face_info(ktp_faces)
        selfie_info = _build_face_info(selfie_faces)

        if not ktp_faces or not selfie_faces:
            status = STATUS_NO_FACE
            reasons = [STATUS_NO_FACE]
            logger.info("Face match no face request_id=%s", request_id)
            return _build_response(
                status=status,
                reasons=reasons,
                match_score=0.0,
                ktp_media_ref=ktp_media_ref,
                selfie_media_ref=selfie_media_ref,
                ktp_info=ktp_info,
                selfie_info=selfie_info,
                timing_ms=_timing(start, detection_ms, 0, 0),
                debug_artifacts=debug_artifacts,
            )

        if len(selfie_faces) > 1 and not settings.allow_multi_select:
            status = STATUS_MULTIPLE
            reasons = [STATUS_MULTIPLE]
            logger.info("Face match multiple faces request_id=%s", request_id)
            return _build_response(
                status=status,
                reasons=reasons,
                match_score=0.0,
                ktp_media_ref=ktp_media_ref,
                selfie_media_ref=selfie_media_ref,
                ktp_info=ktp_info,
                selfie_info=selfie_info,
                timing_ms=_timing(start, detection_ms, 0, 0),
                debug_artifacts=debug_artifacts,
            )

        if len(ktp_faces) > 1:
            logger.warning(
                "Multiple faces detected in KTP request_id=%s count=%s",
                request_id,
                len(ktp_faces),
            )
        ktp_face = _select_face_for_ktp(ktp_faces, ktp_proc, settings)
        if ktp_face is None:
            status = STATUS_NO_FACE
            reasons = [STATUS_NO_FACE]
            logger.warning("KTP face rejected by validation request_id=%s", request_id)
            return _build_response(
                status=status,
                reasons=reasons,
                match_score=0.0,
                ktp_media_ref=ktp_media_ref,
                selfie_media_ref=selfie_media_ref,
                ktp_info=ktp_info,
                selfie_info=selfie_info,
                timing_ms=_timing(start, detection_ms, 0, 0),
                debug_artifacts=debug_artifacts,
            )

        selfie_face = select_best_face(selfie_faces)
        _update_selected_face(ktp_info, ktp_face)
        _update_selected_face(selfie_info, selfie_face)

        _log_face_metrics("ktp", ktp_face, ktp_proc)
        _log_face_metrics("selfie", selfie_face, selfie_proc)

        ktp_quality, ktp_reasons, ktp_face_crop = _compute_quality(
            ktp_proc,
            ktp_face,
            settings.ktp_min_area_ratio,
            settings.min_blur_ktp,
            settings.brightness_min,
            settings.brightness_max,
        )
        selfie_quality, selfie_reasons, selfie_face_crop = _compute_quality(
            selfie_proc,
            selfie_face,
            settings.min_area_ratio_selfie,
            settings.min_blur_selfie,
            settings.brightness_min,
            settings.brightness_max,
        )
        ktp_info["quality"] = ktp_quality
        selfie_info["quality"] = selfie_quality

        reasons = sorted(set(ktp_reasons + selfie_reasons))

        if ktp_reasons and not selfie_reasons:
            logger.warning(
                "Face match KTP quality issues request_id=%s reasons=%s ktp_quality=%s selfie_quality=%s",
                request_id,
                ktp_reasons,
                ktp_quality,
                selfie_quality,
            )
        elif selfie_reasons and not ktp_reasons:
            logger.warning(
                "Face match selfie quality issues request_id=%s reasons=%s ktp_quality=%s selfie_quality=%s",
                request_id,
                selfie_reasons,
                ktp_quality,
                selfie_quality,
            )

        if debug and debug_artifacts is not None:
            if ktp_face_crop is not None:
                _write_debug_image(debug_artifacts, "ktp_face", ktp_face_crop)
            if selfie_face_crop is not None:
                _write_debug_image(debug_artifacts, "selfie_face", selfie_face_crop)

        if reasons:
            logger.warning(
                "Face match quality warnings request_id=%s reasons=%s",
                request_id,
                reasons,
            )

        ktp_face_for_embedding = ktp_face
        ktp_embed_image = ktp_proc
        ktp_area_ratio = _face_area_ratio(_face_bbox(ktp_face), ktp_proc)
        if ktp_area_ratio < settings.upscale_threshold:
            upscaled = _upscale_small_face(ktp_proc, ktp_face, settings.min_face_size)
            if upscaled is not None:
                detect_up_start = time.monotonic()
                up_faces = analyzer.detect(upscaled)
                detection_ms += _elapsed_ms(detect_up_start)
                if up_faces:
                    ktp_face_for_embedding = select_best_face(up_faces)
                    ktp_embed_image = upscaled
                    logger.debug(
                        "KTP face upscaled for embedding request_id=%s area_ratio=%s",
                        request_id,
                        ktp_area_ratio,
                    )

        embed_start = time.monotonic()
        ktp_embedding = _extract_embedding(ktp_face_for_embedding)
        selfie_embedding = _extract_embedding(selfie_face)
        embedding_ms = _elapsed_ms(embed_start)

        if ktp_embedding is None or selfie_embedding is None:
            raise ValueError("EMBEDDING_NOT_AVAILABLE")

        ktp_norm = _l2_normalize(ktp_embedding)
        selfie_norm = _l2_normalize(selfie_embedding)
        ktp_norm_value = float(np.linalg.norm(ktp_embedding))
        selfie_norm_value = float(np.linalg.norm(selfie_embedding))

        sim_start = time.monotonic()
        similarity_raw = _cosine_similarity(ktp_norm, selfie_norm)
        similarity_ms = _elapsed_ms(sim_start)

        if settings.similarity_clamp:
            match_score = max(0.0, min(1.0, similarity_raw))
        else:
            match_score = similarity_raw
        match_score_100 = int(round(match_score * 100))

        logger.debug(
            "Face match similarity raw=%s norm_ktp=%s norm_selfie=%s",
            similarity_raw,
            ktp_norm_value,
            selfie_norm_value,
        )

        if debug and debug_artifacts is not None:
            debug_artifacts["raw_similarity"] = similarity_raw
            debug_artifacts["ktp_embedding_norm"] = ktp_norm_value
            debug_artifacts["selfie_embedding_norm"] = selfie_norm_value
            ktp_aligned = _aligned_crop(ktp_embed_image, ktp_face_for_embedding)
            selfie_aligned = _aligned_crop(selfie_proc, selfie_face)
            if ktp_aligned is not None:
                _write_debug_image(debug_artifacts, "ktp_aligned", ktp_aligned)
            if selfie_aligned is not None:
                _write_debug_image(debug_artifacts, "selfie_aligned", selfie_aligned)

        status = STATUS_OK
        response = _build_response(
            status=status,
            reasons=reasons,
            match_score=match_score,
            match_score_100=match_score_100,
            ktp_media_ref=ktp_media_ref,
            selfie_media_ref=selfie_media_ref,
            ktp_info=ktp_info,
            selfie_info=selfie_info,
            timing_ms=_timing(start, detection_ms, embedding_ms, similarity_ms),
            debug_artifacts=debug_artifacts,
        )
        logger.info(
            "Face match completed request_id=%s status=%s score=%s",
            request_id,
            status,
            match_score,
        )
        return response
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("Face match failed request_id=%s error=%s", request_id, exc)
        return _build_response(
            status=STATUS_ERROR,
            reasons=[str(exc)],
            match_score=0.0,
            ktp_media_ref=ktp_media_ref,
            selfie_media_ref=selfie_media_ref,
            ktp_info=None,
            selfie_info=None,
            timing_ms=_timing(start, 0, 0, 0),
            debug_artifacts=debug_artifacts,
        )


def _load_face_settings() -> _FaceSettings:
    global _FACE_SETTINGS
    if _FACE_SETTINGS is not None:
        return _FACE_SETTINGS
    with _FACE_SETTINGS_LOCK:
        if _FACE_SETTINGS is None:
            config = AppConfig.from_env()
            _FACE_SETTINGS = _FaceSettings(
                model_pack=config.insightface_model_pack,
                max_image_side=config.face_max_image_side,
                max_upload_bytes=config.face_max_upload_bytes,
                ktp_min_area_ratio=config.face_ktp_min_area_ratio,
                min_area_ratio_selfie=config.face_min_area_ratio_selfie,
                min_blur_ktp=config.face_min_blur_ktp,
                min_blur_selfie=config.face_min_blur_selfie,
                brightness_min=config.face_brightness_min,
                brightness_max=config.face_brightness_max,
                upscale_threshold=config.face_upscale_threshold,
                min_face_size=config.face_min_size,
                similarity_clamp=config.face_similarity_clamp,
                allow_multi_select=config.face_allow_multi_select,
                debug_dir=Path(config.face_debug_dir),
                match_threshold=config.face_match_threshold,
            )
    return _FACE_SETTINGS


def _get_face_analyzer() -> InsightFaceAnalyzer:
    global _FACE_ANALYZER
    settings = _load_face_settings()
    if _FACE_ANALYZER is not None:
        return _FACE_ANALYZER
    with _FACE_ANALYZER_LOCK:
        if _FACE_ANALYZER is None:
            det_size = min(settings.max_image_side, 640)
            _FACE_ANALYZER = InsightFaceAnalyzer(
                model_name=settings.model_pack, det_size=det_size
            )
    return _FACE_ANALYZER


def _get_media_client() -> MediaStorageClient:
    global _MEDIA_CLIENT
    if _MEDIA_CLIENT is not None:
        return _MEDIA_CLIENT
    with _MEDIA_CLIENT_LOCK:
        if _MEDIA_CLIENT is None:
            config = AppConfig.from_env()
            _MEDIA_CLIENT = MediaStorageClient(config.media_storage_url)
    return _MEDIA_CLIENT


def _validate_bytes(data: bytes, max_bytes: int) -> None:
    if not data:
        raise ValueError("MISSING_IMAGE")
    if len(data) > max_bytes:
        raise ValueError("IMAGE_TOO_LARGE")


def _decode_image(data: bytes) -> np.ndarray:
    array = np.frombuffer(data, dtype=np.uint8)
    image = cv2.imdecode(array, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("INVALID_IMAGE")
    return image


def _downscale_to_max_side(
    image: np.ndarray, max_side: int
) -> tuple[np.ndarray, float]:
    height, width = image.shape[:2]
    if max(height, width) <= max_side:
        return image, 1.0
    scale = max_side / float(max(height, width))
    new_w = max(1, int(round(width * scale)))
    new_h = max(1, int(round(height * scale)))
    resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
    return resized, scale


def _build_face_info(faces: list) -> dict:
    return {
        "faces_detected": len(faces),
        "selected_face": None,
        "quality": None,
    }


def _update_selected_face(info: dict, face: Any) -> None:
    bbox = _face_bbox(face)
    info["selected_face"] = {
        "bbox": bbox,
        "det_score": float(getattr(face, "det_score", 0.0) or 0.0),
    }


def _select_face_for_ktp(
    faces: list, image: np.ndarray, settings: _FaceSettings
) -> Any | None:
    if not faces:
        return None
    candidates = []
    for face in faces:
        bbox = _face_bbox(face)
        aspect = _bbox_aspect_ratio(bbox)
        if aspect < 0.75 or aspect > 1.5:
            continue
        area_ratio = _face_area_ratio(bbox, image)
        candidates.append((face, area_ratio))

    if not candidates:
        logger.debug("KTP face selection no candidates within aspect ratio")
        return None

    if len(candidates) == 1:
        return candidates[0][0]

    filtered = [c for c in candidates if c[1] >= settings.ktp_min_area_ratio]
    pool = filtered if filtered else candidates
    selected = max(pool, key=lambda c: _face_score(c[0]))[0]
    return selected


def _log_face_metrics(label: str, face: Any, image: np.ndarray) -> None:
    bbox = _face_bbox(face)
    width = max(0, bbox[2] - bbox[0])
    height = max(0, bbox[3] - bbox[1])
    area_ratio = _face_area_ratio(bbox, image)
    logger.debug(
        "Face metrics label=%s bbox=%s size=%sx%s area_ratio=%s",
        label,
        bbox,
        width,
        height,
        area_ratio,
    )


def _compute_quality(
    image: np.ndarray,
    face: Any,
    min_area_ratio: float,
    min_blur: float,
    brightness_min: float,
    brightness_max: float,
) -> tuple[dict, list[str], np.ndarray | None]:
    bbox = _face_bbox(face)
    face_area_ratio = _face_area_ratio(bbox, image)
    crop = _crop_with_padding(image, bbox, 0.2)

    blur = 0.0
    brightness = 0.0
    if crop is not None and crop.size:
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        blur = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        brightness = float(gray.mean())
    else:
        blur = 0.0
        brightness = 0.0

    quality = {
        "blur": blur,
        "brightness": brightness,
        "face_area_ratio": face_area_ratio,
    }

    reasons: list[str] = []
    if face_area_ratio < min_area_ratio:
        reasons.append(REASON_TOO_SMALL)
        logger.debug(
            "Face quality: too small ratio=%s min_ratio=%s",
            face_area_ratio,
            min_area_ratio,
        )
    if blur < min_blur:
        reasons.append(REASON_TOO_BLURRY)
        logger.debug("Face quality: too blurry blur=%s min_blur=%s", blur, min_blur)
    if brightness < brightness_min:
        reasons.append(REASON_TOO_DARK)
        logger.debug(
            "Face quality: too dark brightness=%s min_brightness=%s",
            brightness,
            brightness_min,
        )
    if brightness > brightness_max:
        reasons.append(REASON_TOO_BRIGHT)
        logger.debug(
            "Face quality: too bright brightness=%s max_brightness=%s",
            brightness,
            brightness_max,
        )

    return quality, reasons, crop


def _face_bbox(face: Any) -> list[int]:
    bbox = getattr(face, "bbox", None)
    if bbox is None:
        return [0, 0, 0, 0]
    x0, y0, x1, y1 = bbox[:4]
    return [int(round(x0)), int(round(y0)), int(round(x1)), int(round(y1))]


def _face_score(face: Any) -> float:
    bbox = _face_bbox(face)
    area = _bbox_area(bbox)
    det_score = float(getattr(face, "det_score", 0.0) or 0.0)
    return area * det_score


def _bbox_area(bbox: list[int]) -> float:
    x0, y0, x1, y1 = bbox
    return float(max(0, x1 - x0) * max(0, y1 - y0))


def _bbox_aspect_ratio(bbox: list[int]) -> float:
    width = max(1, bbox[2] - bbox[0])
    height = max(1, bbox[3] - bbox[1])
    return float(width) / float(height)


def _face_area_ratio(bbox: list[int], image: np.ndarray) -> float:
    x0, y0, x1, y1 = bbox
    area = max(0, x1 - x0) * max(0, y1 - y0)
    height, width = image.shape[:2]
    denom = max(1, height * width)
    return float(area) / float(denom)


def _crop_with_padding(
    image: np.ndarray, bbox: list[int], padding_ratio: float
) -> np.ndarray | None:
    x0, y0, x1, y1 = bbox
    height, width = image.shape[:2]
    pad_x = int(round((x1 - x0) * padding_ratio))
    pad_y = int(round((y1 - y0) * padding_ratio))
    x0 = max(0, x0 - pad_x)
    y0 = max(0, y0 - pad_y)
    x1 = min(width, x1 + pad_x)
    y1 = min(height, y1 + pad_y)
    if x1 <= x0 or y1 <= y0:
        return None
    return image[y0:y1, x0:x1]


def _upscale_small_face(
    image: np.ndarray, face: Any, min_size: int
) -> np.ndarray | None:
    bbox = _face_bbox(face)
    crop = _crop_with_padding(image, bbox, 0.2)
    if crop is None or crop.size == 0:
        return None
    height, width = crop.shape[:2]
    max_side = max(height, width)
    target = max(min_size, max_side)
    if target == max_side:
        return crop
    scale = target / float(max_side)
    new_w = max(1, int(round(width * scale)))
    new_h = max(1, int(round(height * scale)))
    resized = cv2.resize(crop, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
    return resized


def _aligned_crop(image: np.ndarray, face: Any) -> np.ndarray | None:
    kps = getattr(face, "kps", None)
    if kps is None:
        return None
    try:
        from insightface.utils.face_align import norm_crop
    except Exception:
        return None
    try:
        return norm_crop(image, kps)
    except Exception:
        return None


def _extract_embedding(face: Any) -> np.ndarray | None:
    if hasattr(face, "normed_embedding") and face.normed_embedding is not None:
        return face.normed_embedding
    if hasattr(face, "embedding") and face.embedding is not None:
        return face.embedding
    return None


def _l2_normalize(vec: np.ndarray) -> np.ndarray:
    norm = float(np.linalg.norm(vec))
    return vec / (norm + 1e-12)


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b))


def _timing(
    start: float,
    detection_ms: int,
    embedding_ms: int,
    similarity_ms: int,
) -> dict:
    return {
        "total": _elapsed_ms(start),
        "detect_embed": detection_ms + embedding_ms,
        "detection_time_ms": detection_ms,
        "embedding_time_ms": embedding_ms,
        "similarity_time_ms": similarity_ms,
    }


def _elapsed_ms(start: float) -> int:
    return int(round((time.monotonic() - start) * 1000))


def _build_response(
    *,
    status: str,
    reasons: list[str],
    match_score: float,
    ktp_media_ref: str | None,
    selfie_media_ref: str | None,
    ktp_info: dict | None,
    selfie_info: dict | None,
    timing_ms: dict,
    debug_artifacts: dict | None,
    match_score_100: int | None = None,
) -> dict:
    if match_score_100 is None:
        match_score_100 = int(round(match_score * 100))
    return {
        "status": status,
        "reasons": reasons,
        "match_score": match_score,
        "match_score_100": match_score_100,
        "ktp_media_ref": ktp_media_ref,
        "selfie_media_ref": selfie_media_ref,
        "ktp": ktp_info,
        "selfie": selfie_info,
        "timing_ms": timing_ms,
        "debug_artifacts": debug_artifacts,
    }


def _init_debug_artifacts(settings: _FaceSettings, request_id: str) -> dict:
    safe = _safe_request_id(request_id)
    path = settings.debug_dir / safe
    path.mkdir(parents=True, exist_ok=True)
    return {"dir": str(path)}


def _write_debug_image(debug_artifacts: dict, name: str, image: np.ndarray) -> None:
    path = Path(debug_artifacts["dir"]) / f"{name}.jpg"
    cv2.imwrite(str(path), image)
    debug_artifacts[name] = str(path)


def _safe_request_id(value: str | None = None) -> str:
    if value:
        return "".join(ch for ch in value if ch.isalnum() or ch in ("-", "_"))[:64]
    return uuid4().hex


def _detect_image_mime(data: bytes) -> str | None:
    try:
        from PIL import Image
    except Exception:
        return None
    try:
        with Image.open(BytesIO(data)) as img:
            fmt = (img.format or "").lower()
    except Exception:
        return None
    if fmt == "jpeg":
        return "image/jpeg"
    if fmt == "png":
        return "image/png"
    if fmt == "webp":
        return "image/webp"
    return None


def _build_filename(prefix: str, mime: str | None) -> str:
    ext = "jpg"
    if mime == "image/png":
        ext = "png"
    elif mime == "image/webp":
        ext = "webp"
    return f"{prefix}-{uuid4().hex}.{ext}"
