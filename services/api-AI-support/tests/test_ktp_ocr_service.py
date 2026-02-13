import os
import sys
import unittest
from pathlib import Path
from unittest import mock

try:
    import numpy as np
except Exception:  # pragma: no cover - optional dependency for tests
    np = None

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from internal.service import ktp_ocr_service as svc


class TestKtpOcrParsing(unittest.TestCase):
    def test_extract_nik_and_name_from_labels(self) -> None:
        lines = [
            {"text": "NIK: 3175 02 1401010001", "conf": 0.92, "bbox": []},
            {"text": "Nama: JOHN DOE", "conf": 0.88, "bbox": []},
        ]
        nik, nik_conf = svc._extract_nik_from_lines(lines)
        name, name_conf = svc._extract_name_from_lines(lines)

        self.assertEqual(nik, "3175021401010001")
        self.assertGreater(nik_conf, 0.0)
        self.assertEqual(name, "JOHN DOE")
        self.assertGreater(name_conf, 0.0)

    def test_extract_name_from_next_line(self) -> None:
        lines = [
            {"text": "Nama", "conf": 0.5, "bbox": []},
            {"text": "SITI AMINAH", "conf": 0.9, "bbox": []},
        ]
        name, name_conf = svc._extract_name_from_lines(lines)
        self.assertEqual(name, "SITI AMINAH")
        self.assertAlmostEqual(name_conf, 0.9, places=3)

    def test_extract_nik_with_separators(self) -> None:
        lines = [
            {"text": "NIK: 1202 0402 0903 0001", "conf": 0.9, "bbox": []},
            {"text": "NIK 1202-0402-0903-0001", "conf": 0.8, "bbox": []},
        ]
        nik, _ = svc._extract_nik_from_lines(lines)
        self.assertEqual(nik, "1202040209030001")


class TestKtpOcrPreprocessing(unittest.TestCase):
    @unittest.skipUnless(np is not None, "numpy not installed")
    @unittest.skipUnless(svc._CV2_AVAILABLE, "cv2 not installed")
    def test_resize_and_binarize(self) -> None:
        image = np.zeros((400, 600, 3), dtype=np.uint8)
        resized, tag = svc._resize_to_target(image, 1000, 2000)
        self.assertEqual(resized.shape[:2], (1000, 1500))
        self.assertTrue(tag.startswith("resize:"))

        binarized = svc._binarize_image(resized)
        self.assertEqual(binarized.shape, resized.shape)
        self.assertEqual(binarized.dtype, np.uint8)

    @unittest.skipUnless(np is not None, "numpy not installed")
    @unittest.skipUnless(svc._CV2_AVAILABLE, "cv2 not installed")
    def test_load_image_from_bytes(self) -> None:
        image = np.zeros((100, 200, 3), dtype=np.uint8)
        import cv2

        ok, encoded = cv2.imencode(".png", image)
        self.assertTrue(ok)
        loaded = svc._load_image(encoded.tobytes())
        self.assertEqual(loaded.shape, image.shape)


class TestOcrEngineInit(unittest.TestCase):
    def test_engine_singleton_default_cpu(self) -> None:
        with mock.patch.dict(os.environ, {"OCR_USE_GPU": "false"}):
            settings = svc._load_ocr_settings()
            svc._reset_ocr_engine_for_tests()
            dummy_engine = object()
            with mock.patch(
                "internal.service.ktp_ocr_service._create_paddle_ocr",
                return_value=dummy_engine,
            ) as factory:
                first = svc._get_ocr_engine(settings)
                second = svc._get_ocr_engine(settings)

        self.assertIs(first, dummy_engine)
        self.assertIs(second, dummy_engine)
        factory.assert_called_once()
        passed_settings = factory.call_args[0][0]
        self.assertFalse(passed_settings.use_gpu)


class TestKtpOcrRoi(unittest.TestCase):
    def test_derive_rois_from_anchors(self) -> None:
        anchors = {
            "nik": {
                "text": "NIK",
                "conf": 0.9,
                "bbox": [[10, 20], [60, 20], [60, 40], [10, 40]],
            },
            "name": {
                "text": "Nama",
                "conf": 0.9,
                "bbox": [[10, 60], [80, 60], [80, 80], [10, 80]],
            },
        }
        rois = svc._derive_rois_from_anchors(anchors, (200, 300, 3), 10)
        self.assertTrue(len(rois) >= 2)
        for x0, y0, x1, y1 in rois:
            self.assertGreater(x1, x0)
            self.assertGreater(y1, y0)
            self.assertGreaterEqual(x0, 0)
            self.assertGreaterEqual(y0, 0)
            self.assertLessEqual(x1, 300)
            self.assertLessEqual(y1, 200)


class TestKtpOcrAnchors(unittest.TestCase):
    def test_anchor_detection_tolerance(self) -> None:
        self.assertTrue(svc._is_anchor_nik("NIK"))
        self.assertTrue(svc._is_anchor_nik("N1K"))
        self.assertTrue(svc._is_anchor_nik("NlK"))
        self.assertTrue(svc._is_anchor_name("Nama"))
        self.assertTrue(svc._is_anchor_name("Namat"))
        self.assertFalse(svc._is_anchor_nik("NIN"))


if __name__ == "__main__":
    unittest.main()
