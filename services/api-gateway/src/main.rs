mod internal;
mod pkg;

use crate::internal::infrastructure::http::axum_server;

fn init_tracing() {
    use tracing_subscriber::{fmt, EnvFilter};

    let subscriber = fmt()
        .with_env_filter(EnvFilter::from_default_env()
        .add_directive("info".parse().unwrap()))
        .finish();

    let _ = tracing::subscriber::set_global_default(subscriber);
}

#[tokio::main]
async fn main() {
    init_tracing();
    tracing::info!("Starting API Gateway Service...");

    if let Err(err) = axum_server::run_http_server().await {
        tracing::error!("Failed to start HTTP server: {err:?}");
    }
}

