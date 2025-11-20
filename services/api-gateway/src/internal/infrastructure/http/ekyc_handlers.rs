use axum::{
    Json,
    extract::{Multipart, Path, State},
    http::StatusCode,
};
use base64::{Engine, engine::general_purpose::STANDARD};
use tracing::error;

use crate::internal::domain::entities::ekyc::BinaryImage;
use crate::internal::domain::services::AiSupportPort;
use crate::internal::infrastructure::http::axum_server::AppState;
use crate::internal::infrastructure::http::backoffice_proxy::EkycSessionDto;
use crate::internal::service::ekyc_service::{ApplicantSubmission, UploadedFile};
use crate::pkg::types::dto::{ApiErrorResponse, ImageUploadDto};
use crate::pkg::types::error::AppError;

type HandlerResult<T> = Result<Json<T>, (StatusCode, Json<ApiErrorResponse>)>;

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSessionRequest {
    user_id: Option<String>,
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartLivenessRequest {
    #[serde(default)]
    frames: Vec<ImageUploadDto>,
    #[serde(default)]
    gestures: Vec<String>,
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplicantRequest {
    full_name: String,
    #[serde(default)]
    nik: Option<String>,
    #[serde(default)]
    birth_date: Option<String>,
    #[serde(default)]
    address: Option<String>,
    phone: String,
    #[serde(default)]
    email: Option<String>,
    #[serde(default)]
    pin: Option<String>,
}

pub async fn create_session<P>(
    State(state): State<AppState<P>>,
    Json(payload): Json<CreateSessionRequest>,
) -> HandlerResult<EkycSessionDto>
where
    P: AiSupportPort + 'static,
{
    state
        .ekyc_service
        .create_session(payload.user_id)
        .await
        .map(Json)
        .map_err(into_http_error)
}

pub async fn upload_id_card<P>(
    State(state): State<AppState<P>>,
    Path(session_id): Path<String>,
    multipart: Multipart,
) -> HandlerResult<EkycSessionDto>
where
    P: AiSupportPort + 'static,
{
    let file = read_file(multipart).await.map_err(into_http_error)?;
    state
        .ekyc_service
        .upload_id_card(&session_id, file)
        .await
        .map(Json)
        .map_err(into_http_error)
}

pub async fn upload_selfie<P>(
    State(state): State<AppState<P>>,
    Path(session_id): Path<String>,
    multipart: Multipart,
) -> HandlerResult<EkycSessionDto>
where
    P: AiSupportPort + 'static,
{
    let file = read_file(multipart).await.map_err(into_http_error)?;
    state
        .ekyc_service
        .upload_selfie(&session_id, file)
        .await
        .map(Json)
        .map_err(into_http_error)
}

pub async fn start_liveness<P>(
    State(state): State<AppState<P>>,
    Path(session_id): Path<String>,
    Json(payload): Json<StartLivenessRequest>,
) -> HandlerResult<EkycSessionDto>
where
    P: AiSupportPort + 'static,
{
    let mut frames = Vec::with_capacity(payload.frames.len());
    for (idx, frame) in payload.frames.into_iter().enumerate() {
        let label = format!("frames[{idx}]");
        frames.push(decode_image(&label, frame).map_err(into_http_error)?);
    }
    state
        .ekyc_service
        .start_liveness(&session_id, frames, payload.gestures)
        .await
        .map(Json)
        .map_err(into_http_error)
}

pub async fn get_session<P>(
    State(state): State<AppState<P>>,
    Path(session_id): Path<String>,
) -> HandlerResult<EkycSessionDto>
where
    P: AiSupportPort + 'static,
{
    state
        .ekyc_service
        .get_session(&session_id)
        .await
        .map(Json)
        .map_err(into_http_error)
}

pub async fn submit_applicant<P>(
    State(state): State<AppState<P>>,
    Path(session_id): Path<String>,
    Json(payload): Json<ApplicantRequest>,
) -> HandlerResult<EkycSessionDto>
where
    P: AiSupportPort + 'static,
{
    let submission = ApplicantSubmission {
        full_name: payload.full_name,
        nik: payload.nik.unwrap_or_default(),
        birth_date: payload.birth_date.unwrap_or_default(),
        address: payload.address.unwrap_or_default(),
        phone: payload.phone,
        email: payload.email.unwrap_or_default(),
        pin: payload.pin.unwrap_or_else(|| "123456".to_string()),
    };
    state
        .ekyc_service
        .submit_applicant(&session_id, submission)
        .await
        .map(Json)
        .map_err(into_http_error)
}

async fn read_file(mut multipart: Multipart) -> Result<UploadedFile, AppError> {
    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|_| AppError::BadRequest("invalid multipart payload".into()))?
    {
        if field.file_name().is_none() {
            continue;
        }
        let filename = field.file_name().map(|v| v.to_string());
        let mime = field.content_type().map(|v| v.to_string());
        let bytes = field
            .bytes()
            .await
            .map_err(|_| AppError::BadRequest("failed to read file data".into()))?
            .to_vec();
        return Ok(UploadedFile {
            filename,
            mime_type: mime,
            bytes,
        });
    }
    Err(AppError::BadRequest("file field is required".to_string()))
}

fn decode_image(field: &str, dto: ImageUploadDto) -> Result<BinaryImage, AppError> {
    let bytes = STANDARD
        .decode(dto.content_base64.as_bytes())
        .map_err(|_| AppError::BadRequest(format!("{field} harus base64 valid")))?;
    if bytes.is_empty() {
        return Err(AppError::BadRequest(format!("{field} tidak boleh kosong")));
    }
    Ok(BinaryImage {
        content: bytes,
        mime_type: dto.mime_type,
    })
}

fn into_http_error(err: AppError) -> (StatusCode, Json<ApiErrorResponse>) {
    let (status, message) = match err {
        AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg),
        AppError::Internal(e) => {
            error!(error = ?e, "internal error");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "internal server error".to_string(),
            )
        }
    };
    (status, Json(ApiErrorResponse { message }))
}
