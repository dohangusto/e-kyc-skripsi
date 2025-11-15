from __future__ import annotations

import io
from pathlib import Path
from typing import Sequence

from PIL import Image

BASE_DIR = Path(__file__).resolve().parents[1]

import sys

if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from internal.infrastructure.ai.easyocr_provider import EasyOcrProvider
from internal.infrastructure.ai.facenet_embedder import FaceNetEmbedder
from internal.infrastructure.ai.mediapipe_liveness import MediaPipeGestureDetector


def _dummy_image() -> bytes:
    image = Image.new("RGB", (256, 256), color=(255, 255, 255))
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def _warm_easyocr(languages: Sequence[str], sample: bytes) -> None:
    provider = EasyOcrProvider(languages, gpu=False)
    try:
        provider.extract(sample)
    except Exception:
        pass


def _warm_facenet(sample: bytes) -> None:
    embedder = FaceNetEmbedder(device="cpu")
    try:
        embedder.embed(sample)
    except Exception:
        pass


def _warm_mediapipe(sample: bytes) -> None:
    detector = MediaPipeGestureDetector()
    try:
        detector.detect(sample)
    except Exception:
        pass
    detector.close()


def main() -> None:
    sample = _dummy_image()
    languages = ("id", "en")
    _warm_easyocr(languages, sample)
    _warm_facenet(sample)
    _warm_mediapipe(sample)


if __name__ == "__main__":
    main()
