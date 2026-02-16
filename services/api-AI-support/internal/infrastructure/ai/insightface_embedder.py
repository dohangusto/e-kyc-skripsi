from __future__ import annotations

import importlib
import logging
import sys
from pathlib import Path
from typing import Iterable

logger = logging.getLogger(__name__)


class InsightFaceAnalyzer:
    def __init__(self, model_name: str = "buffalo_s", det_size: int = 640):
        self._model_name = model_name
        self._det_size = det_size
        _ensure_stdlib_cmd()
        FaceAnalysis = _import_face_analysis()
        self._app = FaceAnalysis(
            name=model_name,
            providers=["CPUExecutionProvider"],
        )
        self._app.prepare(ctx_id=-1, det_size=(det_size, det_size))
        logger.info("InsightFace initialized model=%s det_size=%s", model_name, det_size)

    def detect(self, image) -> list:
        faces = self._app.get(image)
        logger.debug("InsightFace detect faces=%s", len(faces))
        return faces


def select_best_face(faces: Iterable) -> object:
    def _score(face) -> tuple[float, float]:
        det_score = getattr(face, "det_score", 0.0) or 0.0
        bbox = getattr(face, "bbox", None)
        area = 0.0
        if bbox is not None and len(bbox) >= 4:
            x0, y0, x1, y1 = bbox[:4]
            area = max(0.0, float(x1 - x0)) * max(0.0, float(y1 - y0))
        return float(det_score), area

    return max(faces, key=_score)


def _import_face_analysis():
    module = importlib.import_module("insightface.app")
    return module.FaceAnalysis


def _ensure_stdlib_cmd() -> None:
    existing = sys.modules.get("cmd")
    if existing is not None and hasattr(existing, "Cmd"):
        return
    project_root = Path(__file__).resolve().parents[3]
    removed = []
    for entry in list(sys.path):
        if entry in {"", str(project_root)}:
            sys.path.remove(entry)
            removed.append(entry)
    try:
        std_cmd = importlib.import_module("cmd")
        sys.modules["cmd"] = std_cmd
    finally:
        for entry in reversed(removed):
            sys.path.insert(0, entry)
