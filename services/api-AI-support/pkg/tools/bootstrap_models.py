from __future__ import annotations

import io
from pathlib import Path

from PIL import Image

# Make sure the service root (one level above pkg/) is on sys.path so internal imports work
BASE_DIR = Path(__file__).resolve().parents[2]

import sys

if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from internal.infrastructure.ai.facenet_embedder import FaceNetEmbedder
from internal.infrastructure.ai.mediapipe_liveness import MediaPipeGestureDetector


def _dummy_image() -> bytes:
    image = Image.new("RGB", (256, 256), color=(255, 255, 255))
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


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
    _warm_facenet(sample)
    _warm_mediapipe(sample)


if __name__ == "__main__":
    main()
