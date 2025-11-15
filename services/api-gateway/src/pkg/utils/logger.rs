use std::time::Duration;

use axum::{Router, body::Body};
use http::{Request, Response};
use tower_http::trace::TraceLayer;
use tracing::{Span, info, info_span};
use tracing_subscriber::{EnvFilter, fmt};

pub fn with_http_trace(app: Router) -> Router {
    let trace_layer = TraceLayer::new_for_http()
        .make_span_with(|req: &Request<Body>| {
            info_span!(
                "http_request",
                method = %req.method(),
                uri = %req.uri().path(),
            )
        })
        .on_response(|res: &Response<Body>, latency: Duration, span: &Span| {
            info!(
                parent: span,
                status = %res.status().as_u16(),
                latency_ms = %latency.as_millis(),
                "handled request",
            );
        });

    app.layer(trace_layer)
}

pub fn init_local_trace() {
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info,tower_http=info,api_gateway=debug"));

    fmt().with_env_filter(env_filter).init();
}
