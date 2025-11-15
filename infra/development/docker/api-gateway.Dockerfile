# syntax=docker/dockerfile:1.7
FROM rust:1.80
WORKDIR /app

# Pre-install the required toolchain and cache dependency fetches.
# Only copy the manifest files before fetching so changes to source files
# don't invalidate the dependency cache on every Tilt rebuild.
RUN rustup toolchain install nightly && rustup default nightly
COPY Cargo.toml Cargo.lock ./
COPY services/api-gateway/Cargo.toml services/api-gateway/Cargo.toml
RUN mkdir -p services/api-gateway/src \
    && printf '%s\n' 'fn main() {}' > services/api-gateway/src/main.rs
RUN cargo fetch

# Copy the full workspace pieces that the service depends on. This layer
# is invalidated when sources change, but the dependency cache above stays intact.
COPY services services
COPY shared shared

ENTRYPOINT ["cargo", "run", "-p", "api-gateway"]
