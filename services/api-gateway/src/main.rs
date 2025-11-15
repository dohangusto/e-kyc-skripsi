mod internal;
mod pkg;

use std::env;
use std::sync::Arc;

use crate::internal::infrastructure::grpc::ai_support::AiSupportClient;
use crate::internal::infrastructure::http::axum_server::{self, AppState};
use crate::internal::service::ekyc_service::EkycService;
use crate::pkg::types::error::AppResult;
use tracing_subscriber::{EnvFilter, fmt};

fn init_tracing() {
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info,tower_http=info,api_gateway=debug"));

    fmt().with_env_filter(env_filter).init();
}

fn resolve_ai_support_endpoint() -> String {
    env::var("AI_SUPPORT_GRPC_ENDPOINT").unwrap_or_else(|_| "http://127.0.0.1:50052".to_string())
}

async fn build_state() -> AppResult<AppState<AiSupportClient>> {
    let endpoint = resolve_ai_support_endpoint();
    let client = AiSupportClient::connect(&endpoint).await.map_err(|err| {
        tracing::error!(target: "api_gateway", endpoint = %endpoint, "Failed to connect to AI support service");
        err
    })?;

    Ok(AppState {
        ekyc_service: Arc::new(EkycService::new(client)),
    })
}

#[tokio::main]
async fn main() {
    init_tracing();
    tracing::info!("Starting API Gateway Service...");

    match build_state().await {
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
