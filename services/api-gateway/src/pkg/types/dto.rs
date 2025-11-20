use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
pub struct HealthCheckResponse {
    pub status: String,
}

#[derive(Debug, Deserialize)]
pub struct ImageUploadDto {
    pub content_base64: String,
    pub mime_type: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ApiErrorResponse {
    pub message: String,
}
