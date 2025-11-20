mod internal;
mod pkg;

use std::sync::Arc;

use crate::internal::infrastructure::grpc::ai_support::AiSupportClient;
use crate::internal::infrastructure::http::axum_server::{self, AppState};
use crate::internal::infrastructure::http::backoffice_proxy::BackofficeClient;
use crate::internal::infrastructure::http::media_client::MediaClient;
use crate::internal::service::ekyc_service::EkycService;
use crate::pkg::types::error::AppResult;
use crate::pkg::utils::logger;
use crate::pkg::utils::retrieve_env::Env;

async fn build_app_state() -> AppResult<AppState<AiSupportClient>> {
    let ai_support_url = Env::retrieve("AI_SUPPORT_GRPC_ENDPOINT");
    let ai_client = AiSupportClient::new(&ai_support_url)?;
    let backoffice_url = Env::retrieve("BACKOFFICE_HTTP_ENDPOINT");
    let backoffice_client = BackofficeClient::new(&backoffice_url)?;
    let media_endpoint = Env::retrieve("MEDIA_STORAGE_HTTP_ENDPOINT");
    let media_client = Arc::new(MediaClient::new(&media_endpoint)?);
    let backoffice = Arc::new(backoffice_client);
    let face_threshold = Env::retrieve("FACE_MATCH_THRESHOLD")
        .parse::<f64>()
        .unwrap_or(0.78);

    Ok(AppState {
        ekyc_service: Arc::new(EkycService::new(
            ai_client,
            Arc::clone(&backoffice),
            Arc::clone(&media_client),
            face_threshold,
        )),
        backoffice_client: backoffice,
        media_client,
    })
}

#[tokio::main]
async fn main() {
    logger::init_local_trace();
    tracing::info!("Starting API Gateway Service...");

    match build_app_state().await {
        Ok(state) => {
            if let Err(err) = axum_server::run_http_server(state).await {
                tracing::error!("Failed to start HTTP server: {err:?}");
            }
        }
        Err(err) => {
            tracing::error!("Failed to initialise API Gateway: {err:?}");
        }
    }
}
