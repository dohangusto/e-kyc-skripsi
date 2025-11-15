use axum::{
    Json,
    extract::{Multipart, State},
    http::StatusCode,
};
use base64::{Engine, engine::general_purpose::STANDARD};
use tracing::error;
use uuid::Uuid;

use crate::internal::domain::entities::ekyc::{
    AsyncJobHandle, BinaryImage, KtpOcrResultData, PerformOcrPayload, ProcessEkycPayload,
};
use crate::internal::domain::services::AiSupportPort;
use crate::internal::infrastructure::http::axum_server::AppState;
use crate::pkg::types::dto::{
    ApiErrorResponse, ImageUploadDto, JobHandleDto, KtpOcrRequestDto, KtpOcrResponseDto,
    KtpOcrResultDto, StartEkycRequestDto, StartEkycResponseDto,
};
use crate::pkg::types::error::AppError;

type HandlerResult<T> = Result<Json<T>, (StatusCode, Json<ApiErrorResponse>)>;

pub async fn perform_ocr<P>(
    State(state): State<AppState<P>>,
    Json(request): Json<KtpOcrRequestDto>,
) -> HandlerResult<KtpOcrResponseDto>
where
    P: AiSupportPort + 'static,
{
    let payload = decode_ocr_payload(request).map_err(into_http_error)?;

    let result = state
        .ekyc_service
        .perform_ktp_ocr(payload)
        .await
        .map_err(|err| {
            error!(error = ?err, "perform_ktp_ocr failed");
            into_http_error(err)
        })?;

    Ok(Json(KtpOcrResponseDto {
        result: map_ocr_result(result),
    }))
}

pub async fn perform_ocr_upload<P>(
    State(state): State<AppState<P>>,
    mut multipart: Multipart,
) -> HandlerResult<KtpOcrResponseDto>
where
    P: AiSupportPort + 'static,
{
    let payload = decode_multipart_payload(&mut multipart)
        .await
        .map_err(into_http_error)?;

    let result = state
        .ekyc_service
        .perform_ktp_ocr(payload)
        .await
        .map_err(|err| {
            error!(error = ?err, "perform_ktp_ocr upload failed");
            into_http_error(err)
        })?;

    Ok(Json(KtpOcrResponseDto {
        result: map_ocr_result(result),
    }))
}

pub async fn start_async<P>(
    State(state): State<AppState<P>>,
    Json(request): Json<StartEkycRequestDto>,
) -> HandlerResult<StartEkycResponseDto>
where
    P: AiSupportPort + 'static,
{
    let payload = decode_process_payload(request).map_err(into_http_error)?;

    let response = state
        .ekyc_service
        .start_async_jobs(payload)
        .await
        .map_err(|err| {
            error!(error = ?err, "start_async_jobs failed");
            into_http_error(err)
        })?;

    Ok(Json(StartEkycResponseDto {
        ocr_result: map_ocr_result(response.ocr_result),
        face_match_job: map_job_handle(response.face_match_job),
        liveness_job: map_job_handle(response.liveness_job),
    }))
}

fn decode_ocr_payload(request: KtpOcrRequestDto) -> Result<PerformOcrPayload, AppError> {
    let image = decode_image("image", request.image)?;
    Ok(PerformOcrPayload {
        image,
        locale: request.locale,
    })
}

fn decode_process_payload(request: StartEkycRequestDto) -> Result<ProcessEkycPayload, AppError> {
    let ktp_image = decode_image("ktp_image", request.ktp_image)?;
    let selfie_image = decode_image("selfie_image", request.selfie_image)?;
    let mut frames = Vec::with_capacity(request.liveness_frames.len());
    for (idx, frame) in request.liveness_frames.into_iter().enumerate() {
        let label = format!("liveness_frames[{idx}]");
        frames.push(decode_image(&label, frame)?);
    }

    let session_id = request
        .session_id
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| Uuid::new_v4().to_string());

    Ok(ProcessEkycPayload {
        session_id,
        ktp_image,
        selfie_image,
        liveness_frames: frames,
        gestures: request.gestures,
        face_match_threshold: request.face_match_threshold,
        locale: request.locale,
    })
}

fn decode_image(field: &str, dto: ImageUploadDto) -> Result<BinaryImage, AppError> {
    let bytes = STANDARD
        .decode(dto.content_base64.as_bytes())
        .map_err(|_| AppError::BadRequest(format!("{} must be valid base64", field)))?;
    if bytes.is_empty() {
        return Err(AppError::BadRequest(format!("{} content is empty", field)));
    }
    Ok(BinaryImage {
        content: bytes,
        mime_type: dto.mime_type,
    })
}

async fn decode_multipart_payload(
    multipart: &mut Multipart,
) -> Result<PerformOcrPayload, AppError> {
    let mut image = None;
    let mut locale = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|_| AppError::BadRequest("invalid multipart payload".into()))?
    {
        match field.name() {
            Some("file") | Some("image") => {
                let mime_type = field.content_type().map(|ct| ct.to_string()).or_else(|| {
                    field
                        .file_name()
                        .map(|_| "application/octet-stream".to_string())
                });
                let data = field
                    .bytes()
                    .await
                    .map_err(|_| AppError::BadRequest("failed to read uploaded file".into()))?;
                if data.is_empty() {
                    return Err(AppError::BadRequest("uploaded file is empty".into()));
                }
                image = Some(BinaryImage {
                    content: data.to_vec(),
                    mime_type,
                });
            }
            Some("locale") => {
                let value = field
                    .text()
                    .await
                    .map_err(|_| AppError::BadRequest("invalid locale field".into()))?;
                if !value.trim().is_empty() {
                    locale = Some(value);
                }
            }
            _ => continue,
        }
    }

    let image = image.ok_or_else(|| AppError::BadRequest("file field is required".into()))?;
    Ok(PerformOcrPayload { image, locale })
}

fn map_ocr_result(result: KtpOcrResultData) -> KtpOcrResultDto {
    KtpOcrResultDto {
        nik: result.nik,
        name: result.name,
        birth_place: result.birth_place,
        birth_date: result.birth_date,
        gender: result.gender,
        blood_type: result.blood_type,
        address: result.address,
        rt_rw: result.rt_rw,
        village: result.village,
        sub_district: result.sub_district,
        religion: result.religion,
        marital_status: result.marital_status,
        occupation: result.occupation,
        citizenship: result.citizenship,
        issue_date: result.issue_date,
        raw_text: result.raw_text,
        extra_fields: result.extra_fields,
    }
}

fn map_job_handle(handle: AsyncJobHandle) -> JobHandleDto {
    JobHandleDto {
        job_id: handle.job_id,
        queue: handle.queue,
    }
}

fn into_http_error(err: AppError) -> (StatusCode, Json<ApiErrorResponse>) {
    let (status, message) = match err {
        AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg),
        AppError::NotFound => (StatusCode::NOT_FOUND, "resource not found".to_string()),
        AppError::Internal(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            "internal server error".to_string(),
        ),
    };
    (status, Json(ApiErrorResponse { message }))
}
