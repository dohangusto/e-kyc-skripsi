use anyhow::anyhow;
use axum::{
    Json,
    body::Body,
    extract::State,
    http::{Request, Response, StatusCode, header},
    response::IntoResponse,
};
use http_body_util::BodyExt;
use reqwest::Client;
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tracing::debug;

use crate::internal::domain::services::AiSupportPort;
use crate::internal::infrastructure::http::axum_server::AppState;
use crate::pkg::types::dto::ApiErrorResponse;
use crate::pkg::types::error::{AppError, AppResult};

#[derive(Clone)]
pub struct BackofficeClient {
    base_url: String,
    client: Client,
}

impl BackofficeClient {
    pub fn new(base_url: &str) -> AppResult<Self> {
        let normalized = normalize_target(base_url)?;
        Ok(Self {
            base_url: normalized,
            client: Client::new(),
        })
    }

    pub async fn forward(&self, request: Request<Body>) -> AppResult<Response<Body>> {
        let (parts, body) = request.into_parts();
        let path = parts
            .uri
            .path_and_query()
            .map(|pq| pq.as_str())
            .unwrap_or_else(|| parts.uri.path());
        let url = format!("{}{}", self.base_url, path);

        let mut req_builder = self.client.request(parts.method.clone(), url);

        for (name, value) in parts.headers.iter() {
            if name == header::HOST {
                continue;
            }
            req_builder = req_builder.header(name, value);
        }

        let body_bytes = body
            .collect()
            .await
            .map_err(|e| AppError::Internal(e.into()))?
            .to_bytes();

        if !body_bytes.is_empty() {
            req_builder = req_builder.body(body_bytes);
        }

        let response = req_builder
            .send()
            .await
            .map_err(|e| AppError::Internal(e.into()))?;

        let status = response.status();
        let headers = response.headers().clone();
        let bytes = response
            .bytes()
            .await
            .map_err(|e| AppError::Internal(e.into()))?;

        let mut builder = Response::builder().status(status);
        for (name, value) in headers.iter() {
            if name == header::TRANSFER_ENCODING {
                continue;
            }
            builder = builder.header(name, value);
        }

        builder
            .body(Body::from(bytes))
            .map_err(|e| AppError::Internal(e.into()))
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CreateSessionRequest<'a> {
    #[serde(skip_serializing_if = "Option::is_none")]
    user_id: Option<&'a str>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplicantSubmissionRequest<'a> {
    pub full_name: &'a str,
    #[serde(default)]
    pub nik: &'a str,
    #[serde(default)]
    pub birth_date: &'a str,
    #[serde(default)]
    pub address: &'a str,
    pub phone: &'a str,
    #[serde(default)]
    pub email: &'a str,
    #[serde(default)]
    pub pin: &'a str,
}

#[derive(Debug, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSessionPatch<'a> {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id_card_url: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub selfie_with_id_url: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub recorded_video_url: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub face_matching_status: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub liveness_status: Option<&'a str>,
}

impl BackofficeClient {
    fn api_url(&self, path: &str) -> String {
        format!("{}{}", self.base_url, path)
    }

    pub async fn create_ekyc_session(&self, user_id: Option<&str>) -> AppResult<EkycSessionDto> {
        let url = self.api_url("/api/ekyc/sessions");
        let request = CreateSessionRequest { user_id };
        self.send_json(self.client.post(url).json(&request)).await
    }

    pub async fn update_ekyc_session(
        &self,
        session_id: &str,
        patch: &UpdateSessionPatch<'_>,
    ) -> AppResult<EkycSessionDto> {
        let url = self.api_url(&format!("/api/ekyc/sessions/{session_id}/artifacts"));
        self.send_json(self.client.patch(url).json(patch)).await
    }

    pub async fn get_ekyc_session(&self, session_id: &str) -> AppResult<EkycSessionDto> {
        let url = self.api_url(&format!("/api/ekyc/sessions/{session_id}"));
        self.send_json(self.client.get(url)).await
    }

    pub async fn submit_applicant(
        &self,
        session_id: &str,
        payload: ApplicantSubmissionRequest<'_>,
    ) -> AppResult<EkycSessionDto> {
        let url = self.api_url(&format!("/api/ekyc/sessions/{session_id}/applicant"));
        self.send_json(self.client.post(url).json(&payload)).await
    }

    async fn send_json<T>(&self, builder: reqwest::RequestBuilder) -> AppResult<T>
    where
        T: DeserializeOwned,
    {
        let response = builder
            .send()
            .await
            .map_err(|e| AppError::Internal(e.into()))?;
        let status = response.status();
        if !status.is_success() {
            let message = extract_error_message(response).await;
            if status == StatusCode::BAD_REQUEST || status == StatusCode::NOT_FOUND {
                return Err(AppError::BadRequest(message));
            }
            return Err(AppError::Internal(anyhow!(message)));
        }
        response
            .json::<T>()
            .await
            .map_err(|e| AppError::Internal(e.into()))
    }
}

async fn extract_error_message(resp: reqwest::Response) -> String {
    match resp.json::<Value>().await {
        Ok(Value::Object(map)) => map
            .get("message")
            .or_else(|| map.get("error"))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .unwrap_or_else(|| "backoffice error".to_string()),
        _ => "backoffice error".to_string(),
    }
}

fn normalize_target(target: &str) -> AppResult<String> {
    if target.starts_with("http://") || target.starts_with("https://") {
        return Ok(target.trim_end_matches('/').to_string());
    }
    Ok(format!("http://{}", target.trim_end_matches('/')))
}

pub async fn forward_to_backoffice<P>(
    State(state): State<AppState<P>>,
    request: Request<Body>,
) -> Response<Body>
where
    P: AiSupportPort + 'static,
{
    debug!(
        method = ?request.method(),
        path = ?request.uri().path(),
        "forwarding request to api-backoffice"
    );

    match state.backoffice_client.forward(request).await {
        Ok(response) => response,
        Err(_) => (
            StatusCode::BAD_GATEWAY,
            Json(ApiErrorResponse {
                message: "backoffice service unavailable".to_string(),
            }),
        )
            .into_response(),
    }
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EkycSessionDto {
    pub id: String,
    #[serde(default)]
    pub user_id: Option<String>,
    pub status: String,
    pub face_matching_status: String,
    pub liveness_status: String,
    pub final_decision: String,
    #[serde(default)]
    pub id_card_url: Option<String>,
    #[serde(default)]
    pub selfie_with_id_url: Option<String>,
    #[serde(default)]
    pub recorded_video_url: Option<String>,
    #[serde(default)]
    pub face_match_overall: Option<String>,
    #[serde(default)]
    pub liveness_overall: Option<String>,
    #[serde(default)]
    pub rejection_reason: Option<String>,
    pub metadata: Value,
    pub created_at: String,
    pub updated_at: String,
    #[serde(default)]
    pub face_checks: Vec<FaceCheckDto>,
    #[serde(default)]
    pub liveness_check: Option<LivenessCheckDto>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FaceCheckDto {
    pub id: String,
    pub ekyc_session_id: String,
    pub step: String,
    #[serde(default)]
    pub similarity_score: Option<f64>,
    #[serde(default)]
    pub threshold: Option<f64>,
    pub result: String,
    pub raw_metadata: Value,
    pub created_at: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LivenessCheckDto {
    pub id: String,
    pub ekyc_session_id: String,
    pub overall_result: String,
    #[serde(default)]
    pub per_gesture_result: Value,
    #[serde(default)]
    pub recorded_video_url: Option<String>,
    pub raw_metadata: Value,
    pub created_at: String,
}
