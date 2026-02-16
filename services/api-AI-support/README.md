# api-AI-support (PYTHON - HTTP OCR)

This service provides HTTP endpoints for OCR, focused on KTP extraction. Face matching, liveness detection, and gRPC are
no longer part of this service.

## HTTP Endpoints

- `POST /ocr/ktp`
  - Runs KTP OCR extraction.
  - Body: raw bytes or multipart form-data (`image` field).
- `POST /ocr/ktp-debug`
  - Runs KTP OCR with debug output.
  - Supports `debug`, `request_id`, and `ground_truth` fields via multipart or query params.

## Configuration

Key environment variables (see `pkg/types/config.py` for defaults):

- `AI_SUPPORT_HTTP_ADDR`
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

1. Install dependencies:

   ```bash
   pip install -r services/api-AI-support/requirements.txt
   ```

2. Start the service:

   ```bash
   python services/api-AI-support/cmd/main.py
   ```
