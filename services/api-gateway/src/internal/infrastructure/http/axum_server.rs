use anyhow::anyhow;
use axum::{routing::get, Router};
use std::{env, net::SocketAddr};
use tokio::net::TcpListener;
use tower_http::trace::TraceLayer;

use crate::internal::infrastructure::http::handlers;
use crate::pkg::types::error::{AppError, AppResult};

fn parse_socket_addr(raw: &str) -> AppResult<SocketAddr> {
    if raw.trim().is_empty() {
        return Err(AppError::Internal(anyhow!("GATEWAY_HTTP_ADDR is empty")));
    }

    let normalized = if raw.starts_with(':') {
        format!("0.0.0.0{raw}")
    } else if raw.contains(':') {
        raw.to_string()
    } else {
        format!("0.0.0.0:{raw}")
    };

    normalized
        .parse::<SocketAddr>()
        .map_err(|e| AppError::Internal(e.into()))
}

fn resolve_listen_addr() -> AppResult<SocketAddr> {
    match env::var("GATEWAY_HTTP_ADDR") {
        Ok(raw) => parse_socket_addr(&raw),
        Err(_) => Ok(SocketAddr::from(([0, 0, 0, 0], 8080))),
    }
}

pub async fn run_http_server() -> AppResult<()> {
    let app = Router::new()
        .route("/health", get(handlers::health_check))
        .layer(TraceLayer::new_for_http());

    let addr = resolve_listen_addr()?;
    tracing::info!("HTTP Server listening on http://{addr}");

    let listener = TcpListener::bind(addr)
        .await
        .map_err(|e| {
            tracing::error!("Failed to bind HTTP listener on {addr}: {e:?}");
            AppError::Internal(e.into())
        })?;

    axum::serve(listener, app)
        .await
        .map_err(|e| AppError::Internal(e.into()))
}
