use axum::{http::StatusCode, Json};

use crate::pkg::types::dto::HealthCheckResponse;

pub async fn health_check() -> (StatusCode, Json<HealthCheckResponse>) {
    let body = HealthCheckResponse {
        status: "Ok".to_string(),
    };

    (StatusCode::OK, Json(body))
}