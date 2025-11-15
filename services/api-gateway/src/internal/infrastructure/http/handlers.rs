use axum::{Json, http::StatusCode};

use crate::pkg::types::dto::HealthCheckResponse;

pub async fn health_check() -> (StatusCode, Json<HealthCheckResponse>) {
    let body = HealthCheckResponse {
        status: "Ok".to_string(),
    };

    (StatusCode::OK, Json(body))
}
