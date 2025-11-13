from __future__ import annotations

import math
from typing import Sequence

import numpy as np

from internal.domain.face_match import (
    FaceEmbeddingProvider,
    FaceMatchJob,
    FaceMatchProcessorPort,
    FaceMatchResult,
)


class FaceMatchService(FaceMatchProcessorPort):
    def __init__(self, embedder: FaceEmbeddingProvider):
        self._embedder = embedder

    def evaluate(self, job: FaceMatchJob) -> FaceMatchResult:
        try:
            reference = _to_vector(self._embedder.embed(job.ktp_image))
            probe = _to_vector(self._embedder.embed(job.selfie_image))
            similarity = _cosine_similarity(reference, probe)
            matched = similarity >= job.threshold
            return FaceMatchResult(
                job_id=job.job_id,
                session_id=job.session_id,
                similarity=similarity,
                threshold=job.threshold,
                matched=matched,
                error=None,
            )
        except Exception as exc:  # pragma: no cover - defensive
            return FaceMatchResult(
                job_id=job.job_id,
                session_id=job.session_id,
                similarity=0.0,
                threshold=job.threshold,
                matched=False,
                error=str(exc),
            )


def _to_vector(values: Sequence[float]) -> np.ndarray:
    vector = np.asarray(values, dtype=np.float32).flatten()
    if not vector.size:
        raise ValueError("empty embedding vector")
    return vector


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    denom = float(np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0 or math.isclose(denom, 0.0):
        return 0.0
    similarity = float(np.dot(a, b) / denom)
    return max(min(similarity, 1.0), -1.0)
