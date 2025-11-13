from __future__ import annotations

import io
import logging
from typing import Sequence

import numpy as np
import torch
from PIL import Image
from facenet_pytorch import InceptionResnetV1, MTCNN

from internal.domain.face_match import FaceEmbeddingProvider

logger = logging.getLogger(__name__)


class FaceNetEmbedder(FaceEmbeddingProvider):
    def __init__(self, device: str = "cpu", image_size: int = 160):
        self._device = torch.device(device)
        self._mtcnn = MTCNN(image_size=image_size, margin=0, select_largest=True, device=self._device)
        self._resnet = InceptionResnetV1(pretrained="vggface2").eval().to(self._device)
        logger.info("FaceNet embedder initialised on device %s", self._device)

    def embed(self, image: bytes) -> Sequence[float]:
        with Image.open(io.BytesIO(image)) as pil_image:
            tensor = self._mtcnn(pil_image.convert("RGB"))
        if tensor is None:
            raise ValueError("unable to detect a face in the provided image")
        tensor = tensor.to(self._device).unsqueeze(0)
        with torch.no_grad():
            embedding = self._resnet(tensor)
        return embedding.squeeze(0).cpu().numpy().astype(np.float32).tolist()
