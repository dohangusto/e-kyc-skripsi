use crate::pkg::utils::logger::with_http_trace;
use anyhow::anyhow;
use axum::{
    Router,
    routing::{get, post},
};
use std::{env, net::SocketAddr, sync::Arc};
use tokio::net::TcpListener;

use crate::internal::domain::services::AiSupportPort;
use crate::internal::infrastructure::http::{ekyc_handlers, handlers};
use crate::internal::service::ekyc_service::EkycService;
use crate::pkg::types::error::{AppError, AppResult};

pub struct AppState<P: AiSupportPort + 'static> {
    pub ekyc_service: Arc<EkycService<P>>,
}

impl<P: AiSupportPort + 'static> Clone for AppState<P> {
    fn clone(&self) -> Self {
        Self {
            ekyc_service: Arc::clone(&self.ekyc_service),
        }
    }
}

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

pub async fn run_http_server<P>(state: AppState<P>) -> AppResult<()>
where
    P: AiSupportPort + 'static,
{
    let app = Router::new()
        .route("/health", get(handlers::health_check))
        .route("/ekyc/ocr", post(ekyc_handlers::perform_ocr::<P>))
        .route(
            "/ekyc/ocr/upload",
            post(ekyc_handlers::perform_ocr_upload::<P>),
        )
        .route("/ekyc/process", post(ekyc_handlers::start_async::<P>))
        .with_state(state);

    let app = with_http_trace(app);

    let addr = resolve_listen_addr()?;
    tracing::info!("HTTP Server listening on http://{addr}");

    let listener = TcpListener::bind(addr).await.map_err(|e| {
        tracing::error!("Failed to bind HTTP listener on {addr}: {e:?}");
        AppError::Internal(e.into())
    })?;

    axum::serve(listener, app)
        .await
        .map_err(|e| AppError::Internal(e.into()))
}
