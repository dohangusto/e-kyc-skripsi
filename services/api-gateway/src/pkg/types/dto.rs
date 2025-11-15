use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Serialize)]
pub struct HealthCheckResponse {
    pub status: String,
}

#[derive(Debug, Deserialize)]
pub struct ImageUploadDto {
    pub content_base64: String,
    pub mime_type: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct KtpOcrRequestDto {
    pub image: ImageUploadDto,
    pub locale: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct KtpOcrResponseDto {
    pub result: KtpOcrResultDto,
}

#[derive(Debug, Serialize)]
pub struct KtpOcrResultDto {
    pub nik: Option<String>,
    pub name: Option<String>,
    pub birth_place: Option<String>,
    pub birth_date: Option<String>,
    pub gender: Option<String>,
    pub blood_type: Option<String>,
    pub address: Option<String>,
    pub rt_rw: Option<String>,
    pub village: Option<String>,
    pub sub_district: Option<String>,
    pub religion: Option<String>,
    pub marital_status: Option<String>,
    pub occupation: Option<String>,
    pub citizenship: Option<String>,
    pub issue_date: Option<String>,
    pub raw_text: String,
    pub extra_fields: BTreeMap<String, String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartEkycRequestDto {
    pub session_id: Option<String>,
    pub ktp_image: ImageUploadDto,
    pub selfie_image: ImageUploadDto,
    #[serde(default)]
    pub liveness_frames: Vec<ImageUploadDto>,
    #[serde(default)]
    pub gestures: Vec<String>,
    pub face_match_threshold: Option<f64>,
    pub locale: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct StartEkycResponseDto {
    pub ocr_result: KtpOcrResultDto,
    pub face_match_job: JobHandleDto,
    pub liveness_job: JobHandleDto,
}

#[derive(Debug, Serialize)]
pub struct JobHandleDto {
    pub job_id: String,
    pub queue: String,
}

#[derive(Debug, Serialize)]
pub struct ApiErrorResponse {
    pub message: String,
}
