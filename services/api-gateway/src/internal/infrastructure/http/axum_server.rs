use anyhow::anyhow;
use axum::{
    Router,
    routing::{any, get, post},
};
use std::{env, net::SocketAddr, sync::Arc};
use tokio::net::TcpListener;
use tower_http::cors::{Any, CorsLayer};

use crate::internal::domain::services::AiSupportPort;
use crate::internal::infrastructure::http::backoffice_proxy::BackofficeClient;
use crate::internal::infrastructure::http::media_client::MediaClient;
use crate::internal::infrastructure::http::{backoffice_proxy, ekyc_handlers, handlers};
use crate::internal::service::ekyc_service::EkycService;
use crate::pkg::types::error::{AppError, AppResult};
use crate::pkg::utils::logger::with_http_trace;

pub struct AppState<P: AiSupportPort + 'static> {
    pub ekyc_service: Arc<EkycService<P>>,
    pub backoffice_client: Arc<BackofficeClient>,
    pub media_client: Arc<MediaClient>,
}

impl<P: AiSupportPort + 'static> Clone for AppState<P> {
    fn clone(&self) -> Self {
        Self {
            ekyc_service: Arc::clone(&self.ekyc_service),
            backoffice_client: Arc::clone(&self.backoffice_client),
            media_client: Arc::clone(&self.media_client),
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
    env::var("GATEWAY_HTTP_ADDR")
        .map(|raw| parse_socket_addr(&raw))
        .unwrap_or_else(|_| Ok(SocketAddr::from(([0, 0, 0, 0], 8080))))
}

pub async fn run_http_server<P>(state: AppState<P>) -> AppResult<()>
where
    P: AiSupportPort + 'static,
{
    let router_state = state.clone();
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);
    let app = Router::new()
        .route("/health", get(handlers::health_check))
        .route("/ekyc/sessions", post(ekyc_handlers::create_session::<P>))
        .route(
            "/ekyc/sessions/:id/id-card",
            post(ekyc_handlers::upload_id_card::<P>),
        )
        .route(
            "/ekyc/sessions/:id/selfie-with-id",
            post(ekyc_handlers::upload_selfie::<P>),
        )
        .route(
            "/ekyc/sessions/:id/liveness",
            post(ekyc_handlers::start_liveness::<P>),
        )
        .route(
            "/ekyc/sessions/:id/applicant",
            post(ekyc_handlers::submit_applicant::<P>),
        )
        .route("/ekyc/sessions/:id", get(ekyc_handlers::get_session::<P>))
        .route(
            "/api/*path",
            any(backoffice_proxy::forward_to_backoffice::<P>),
        )
        .with_state(router_state)
        .layer(cors);

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
