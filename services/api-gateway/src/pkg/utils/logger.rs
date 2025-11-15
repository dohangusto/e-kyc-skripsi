use std::time::Duration;

use axum::{Router, body::Body};
use http::{Request, Response};
use tower_http::trace::TraceLayer;
use tracing::{Span, info, info_span};

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
