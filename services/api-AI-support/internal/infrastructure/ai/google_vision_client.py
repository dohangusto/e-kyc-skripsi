from __future__ import annotations

from pathlib import Path

from google.cloud import vision
from google.oauth2 import service_account


def build_vision_client(credentials_path: str) -> vision.ImageAnnotatorClient:
    """Create a Vision API client using a service account file."""
    path = Path(credentials_path)
    if path.exists():
        credentials = service_account.Credentials.from_service_account_file(path)
        return vision.ImageAnnotatorClient(credentials=credentials)
    return vision.ImageAnnotatorClient()
