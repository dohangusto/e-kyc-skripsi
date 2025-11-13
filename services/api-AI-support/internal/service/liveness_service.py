from __future__ import annotations

from typing import List, Sequence

from internal.domain.liveness import (
    GestureDetector,
    LivenessJob,
    LivenessProcessorPort,
    LivenessResult,
)


class LivenessService(LivenessProcessorPort):
    def __init__(self, detector: GestureDetector):
        self._detector = detector

    def evaluate(self, job: LivenessJob) -> LivenessResult:
        try:
            detected_sequences: List[set[str]] = [
                self._normalize(self._detector.detect(frame)) for frame in job.frames
            ]
            matched, missing = _match_sequences(job.gestures, detected_sequences)
            return LivenessResult(
                job_id=job.job_id,
                session_id=job.session_id,
                passed=len(missing) == 0,
                matched_gestures=tuple(matched),
                missing_gestures=tuple(missing),
                error=None,
            )
        except Exception as exc:  # pragma: no cover - defensive
            return LivenessResult(
                job_id=job.job_id,
                session_id=job.session_id,
                passed=False,
                matched_gestures=(),
                missing_gestures=tuple(_normalize_sequence(job.gestures)),
                error=str(exc),
            )

    @staticmethod
    def _normalize(gestures: Sequence[str]) -> set[str]:
        return {gesture.upper() for gesture in gestures}


def _normalize_sequence(gestures: Sequence[str]) -> List[str]:
    return [gesture.upper() for gesture in gestures]


def _match_sequences(expected: Sequence[str], detected: Sequence[set[str]]) -> tuple[List[str], List[str]]:
    normalized = _normalize_sequence(expected)
    matched: List[str] = []
    missing: List[str] = []
    if not normalized:
        return matched, missing
    pointer = 0
    for target in normalized:
        found = False
        while pointer < len(detected):
            current = detected[pointer]
            pointer += 1
            if target in current:
                matched.append(target)
                found = True
                break
        if not found:
            missing.append(target)
    return matched, missing
