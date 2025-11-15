mod internal;
mod pkg;

use std::sync::Arc;

use crate::internal::infrastructure::grpc::ai_support::AiSupportClient;
use crate::internal::infrastructure::http::axum_server::{self, AppState};
use crate::internal::service::ekyc_service::EkycService;
use crate::pkg::types::error::AppResult;
use crate::pkg::utils::logger;
use crate::pkg::utils::retrieve_env::Env;

async fn build_app_state() -> AppResult<AppState<AiSupportClient>> {
    let ai_support_url = Env::retrieve("AI_SUPPORT_GRPC_ENDPOINT");
    let client = AiSupportClient::new(&ai_support_url)?;

    Ok(AppState {
        ekyc_service: Arc::new(EkycService::new(client)),
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
