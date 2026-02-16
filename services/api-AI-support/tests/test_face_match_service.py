import unittest
from io import BytesIO
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

import numpy as np
from internal.service import face_match_service as svc
from PIL import Image


class DummyMediaClient:
    def __init__(self):
        self.calls = []

    def upload_bytes(self, data, filename=None, mime_type=None):
        self.calls.append((data, filename, mime_type))
        return {"id": "media-id", "url": "http://media.local/media/media-id"}


class SequenceAnalyzer:
    def __init__(self, responses):
        self._responses = list(responses)

    def detect(self, image):
        if not self._responses:
            return []
        return self._responses.pop(0)


def _image_bytes(color=(255, 255, 255)):
    image = Image.new("RGB", (120, 120), color=color)
    buffer = BytesIO()
    image.save(buffer, format="JPEG")
    return buffer.getvalue()


def _face(embedding=None):
    if embedding is None:
        embedding = np.array([1.0, 0.0, 0.0], dtype=np.float32)
    return SimpleNamespace(
        bbox=np.array([10.0, 10.0, 60.0, 60.0], dtype=np.float32),
        det_score=0.9,
        embedding=embedding,
    )


class TestFaceMatchService(unittest.TestCase):
    def _settings(self):
        return svc._FaceSettings(
            model_pack="buffalo_s",
            max_image_side=1600,
            max_upload_bytes=6_000_000,
            min_area_ratio_ktp=0.02,
            min_area_ratio_selfie=0.02,
            min_blur_ktp=80.0,
            min_blur_selfie=80.0,
            brightness_min=40.0,
            brightness_max=220.0,
            allow_multi_select=False,
            debug_dir=Path("/tmp/api-ai-support-face"),
            match_threshold=0.78,
        )

    def test_no_face(self):
        media = DummyMediaClient()
        analyzer = SequenceAnalyzer([[], []])
        with (
            mock.patch.object(svc, "_get_media_client", return_value=media),
            mock.patch.object(svc, "_get_face_analyzer", return_value=analyzer),
            mock.patch.object(
                svc, "_load_face_settings", return_value=self._settings()
            ),
        ):
            result = svc.match_face_ktp_selfie(_image_bytes(), _image_bytes())

        self.assertEqual(result["status"], svc.STATUS_NO_FACE)
        self.assertIn("NO_FACE", result["reasons"])
        self.assertIsNotNone(result["ktp_media_ref"])
        self.assertIsNotNone(result["selfie_media_ref"])
        self.assertEqual(result["ktp"]["faces_detected"], 0)
        self.assertEqual(result["selfie"]["faces_detected"], 0)
        self.assertEqual(len(media.calls), 2)

    def test_multiple_faces(self):
        media = DummyMediaClient()
        faces = [_face(), _face()]
        analyzer = SequenceAnalyzer([faces, faces])
        with (
            mock.patch.object(svc, "_get_media_client", return_value=media),
            mock.patch.object(svc, "_get_face_analyzer", return_value=analyzer),
            mock.patch.object(
                svc, "_load_face_settings", return_value=self._settings()
            ),
        ):
            result = svc.match_face_ktp_selfie(_image_bytes(), _image_bytes())

        self.assertEqual(result["status"], svc.STATUS_MULTIPLE)
        self.assertIn("MULTIPLE_FACES", result["reasons"])

    def test_low_quality(self):
        media = DummyMediaClient()
        analyzer = SequenceAnalyzer([[_face()], [_face()]])
        low_quality = (
            {"blur": 10.0, "brightness": 20.0, "face_area_ratio": 0.01},
            [svc.REASON_TOO_BLURRY],
            None,
        )
        ok_quality = (
            {"blur": 120.0, "brightness": 100.0, "face_area_ratio": 0.2},
            [],
            None,
        )
        with (
            mock.patch.object(svc, "_get_media_client", return_value=media),
            mock.patch.object(svc, "_get_face_analyzer", return_value=analyzer),
            mock.patch.object(
                svc, "_load_face_settings", return_value=self._settings()
            ),
            mock.patch.object(
                svc, "_compute_quality", side_effect=[low_quality, ok_quality]
            ),
        ):
            result = svc.match_face_ktp_selfie(_image_bytes(), _image_bytes())

        self.assertEqual(result["status"], svc.STATUS_OK)
        self.assertIn(svc.REASON_TOO_BLURRY, result["reasons"])

    def test_ok_similarity(self):
        media = DummyMediaClient()
        face_a = _face(np.array([1.0, 0.0, 0.0], dtype=np.float32))
        face_b = _face(np.array([1.0, 0.0, 0.0], dtype=np.float32))
        analyzer = SequenceAnalyzer([[face_a], [face_b]])
        ok_quality = (
            {"blur": 120.0, "brightness": 100.0, "face_area_ratio": 0.2},
            [],
            None,
        )
        with (
            mock.patch.object(svc, "_get_media_client", return_value=media),
            mock.patch.object(svc, "_get_face_analyzer", return_value=analyzer),
            mock.patch.object(
                svc, "_load_face_settings", return_value=self._settings()
            ),
            mock.patch.object(
                svc, "_compute_quality", side_effect=[ok_quality, ok_quality]
            ),
        ):
            result = svc.match_face_ktp_selfie(_image_bytes(), _image_bytes())

        self.assertEqual(result["status"], svc.STATUS_OK)
        self.assertAlmostEqual(result["match_score"], 1.0, places=3)
        self.assertEqual(result["match_score_100"], 100)


if __name__ == "__main__":
    unittest.main()
