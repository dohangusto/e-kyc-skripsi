from __future__ import annotations

import io
import math
from typing import Set

import mediapipe as mp
import numpy as np
from PIL import Image

from internal.domain.liveness import GestureDetector

_FACE_MESH = mp.solutions.face_mesh


class MediaPipeGestureDetector(GestureDetector):
    def __init__(self, min_detection_confidence: float = 0.5):
        self._mesh = _FACE_MESH.FaceMesh(
            static_image_mode=True,
            refine_landmarks=True,
            max_num_faces=1,
            min_detection_confidence=min_detection_confidence,
        )

    def detect(self, frame: bytes) -> set[str]:
        image = _to_rgb(frame)
        results = self._mesh.process(image)
        if not results.multi_face_landmarks:
            return {"NO_FACE"}
        landmarks = results.multi_face_landmarks[0].landmark
        gestures: Set[str] = set()
        if _is_blinking(landmarks):
            gestures.add("BLINK")
        yaw = _estimate_yaw(landmarks)
        if yaw <= -0.04:
            gestures.add("TURN_LEFT")
        elif yaw >= 0.04:
            gestures.add("TURN_RIGHT")
        if _mouth_open(landmarks):
            gestures.add("OPEN_MOUTH")
        if not gestures:
            gestures.add("FACE_PRESENT")
        return gestures

    def close(self) -> None:
        self._mesh.close()


def _to_rgb(frame: bytes) -> np.ndarray:
    with Image.open(io.BytesIO(frame)) as image:
        return np.array(image.convert("RGB"))


def _landmark_coords(landmarks, index: int) -> tuple[float, float]:
    landmark = landmarks[index]
    return landmark.x, landmark.y


def _distance(a: tuple[float, float], b: tuple[float, float]) -> float:
    return math.dist(a, b)


def _eye_aspect_ratio(landmarks, top: int, bottom: int, left: int, right: int) -> float:
    vertical = _distance(_landmark_coords(landmarks, top), _landmark_coords(landmarks, bottom))
    horizontal = _distance(_landmark_coords(landmarks, left), _landmark_coords(landmarks, right))
    if horizontal == 0:
        return 0.0
    return vertical / horizontal


def _is_blinking(landmarks) -> bool:
    left = _eye_aspect_ratio(landmarks, 159, 145, 33, 133)
    right = _eye_aspect_ratio(landmarks, 386, 374, 362, 263)
    return (left + right) / 2.0 < 0.19


def _mouth_open(landmarks) -> bool:
    vertical = _distance(_landmark_coords(landmarks, 13), _landmark_coords(landmarks, 14))
    horizontal = _distance(_landmark_coords(landmarks, 78), _landmark_coords(landmarks, 308))
    if horizontal == 0:
        return False
    return (vertical / horizontal) > 0.35


def _estimate_yaw(landmarks) -> float:
    nose = _landmark_coords(landmarks, 1)[0]
    left = _landmark_coords(landmarks, 234)[0]
    right = _landmark_coords(landmarks, 454)[0]
    left_dist = nose - left
    right_dist = right - nose
    return left_dist - right_dist
