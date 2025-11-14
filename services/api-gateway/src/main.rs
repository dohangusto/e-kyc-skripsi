mod internal;
mod pkg;

use crate::internal::infrastructure::http::axum_server;
use tracing_subscriber::{fmt, EnvFilter};

fn init_tracing() {
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info,tower_http=info,api_gateway=debug"));

    fmt()
        .with_env_filter(env_filter)
        .init();
}

#[tokio::main]
async fn main() {
    init_tracing();
    tracing::info!("Starting API Gateway Service...");

    if let Err(err) = axum_server::run_http_server().await {
        tracing::error!("Failed to start HTTP server: {err:?}");
    }
}

