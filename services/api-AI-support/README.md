# api-AI-support (PYTHON - HTTP OCR)

This service provides HTTP endpoints for OCR (KTP) and face matching. Liveness detection and gRPC are
no longer part of this service. Face uploads are stored in the internal `api-media-storage` service before matching.

## HTTP Endpoints

- `GET /health` or `GET /healthz`
  - Returns basic service readiness.

- `POST /ocr/ktp`
  - Runs KTP OCR extraction.
  - Body: raw bytes or multipart form-data (`image` field).
- `POST /ocr/ktp-debug`
  - Runs KTP OCR with debug output.
  - Supports `debug`, `request_id`, and `ground_truth` fields via multipart or query params.
- `POST /face-match`
  - Face matching using InsightFace (model pack configurable).
  - Body: multipart form-data with `ktp_image` and `selfie_image`.
  - Stores both images to `api-media-storage` and returns refs in response.

Example request:

```bash
curl -X POST http://localhost:8082/face-match \
  -F ktp_image=@/path/to/ktp.jpg \
  -F selfie_image=@/path/to/selfie.jpg
```

## Configuration

Key environment variables (see `pkg/types/config.py` for defaults):

- `AI_SUPPORT_HTTP_ADDR`
- `MEDIA_STORAGE_HTTP_ENDPOINT`
- `FACE_MATCH_THRESHOLD`
- `INSIGHTFACE_MODEL_PACK`
- `FACE_MAX_IMAGE_SIDE`
- `FACE_MAX_UPLOAD_BYTES`
- `FACE_KTP_MIN_AREA_RATIO` (fallback ke `FACE_MIN_AREA_RATIO_KTP` -> `FACE_MIN_AREA_RATIO`)
- `FACE_MIN_AREA_RATIO_KTP`
- `FACE_MIN_AREA_RATIO_SELFIE` (fallback ke `FACE_MIN_AREA_RATIO`)
- `FACE_MIN_AREA_RATIO`
- `FACE_MIN_BLUR_KTP` (fallback ke `FACE_MIN_BLUR`)
- `FACE_MIN_BLUR_SELFIE` (fallback ke `FACE_MIN_BLUR`)
- `FACE_MIN_BLUR`
- `FACE_BRIGHTNESS_MIN`
- `FACE_BRIGHTNESS_MAX`
- `FACE_UPSCALE_THRESHOLD`
- `FACE_MIN_SIZE`
- `FACE_SIMILARITY_CLAMP`
- `FACE_ALLOW_MULTI_SELECT`
- `FACE_DEBUG_DIR`
- `OCR_DEBUG_DIR`
- `OCR_MAX_IMAGE_SIDE`
- `OCR_MIN_DIM_TARGET`
- `OCR_ENABLE_CROP`
- `OCR_ENABLE_BINARIZE`
- `OCR_ENABLE_ROTATE_SEARCH`
- `OCR_TIMEOUT_MS`
- `OCR_USE_GPU`
- `OCR_LANG`
- `OCR_ENABLE_TWO_PASS`
- `OCR_PASS1_MAX_SIDE`
- `OCR_ROI_PADDING`
- `OCR_ROI_MAX_SIDE`
- `OCR_ENABLE_FULLPAGE_FALLBACK`

## Running Locally

### Conda Setup

Recommended when running locally on macOS.

1. Create and activate an environment:

   ```bash
   conda create -n ai-support python=3.11
   conda activate ai-support
   ```

2. Install dependencies:

   ```bash
   pip install -r services/api-AI-support/requirements.txt
   ```

3. If you see conflicts for `opt-einsum` or `numpy`, ensure these pins:

   ```bash
   pip install --upgrade --force-reinstall numpy==1.26.4 opt-einsum==3.3.0
   pip install -r services/api-AI-support/requirements.txt
   pip check
   ```

4. Start the service:

   ```bash
   python services/api-AI-support/cmd/main.py
   ```

