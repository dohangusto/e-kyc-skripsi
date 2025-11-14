# syntax=docker/dockerfile:1.7
FROM rust:1.80
WORKDIR /app

# Pre-install the required toolchain and cache dependency fetches.
# Only copy the manifest files before fetching so changes to source files
# don't invalidate the dependency cache on every Tilt rebuild.
RUN rustup toolchain install nightly && rustup default nightly
COPY Cargo.toml Cargo.lock ./
COPY services/api-gateway/Cargo.toml services/api-gateway/Cargo.toml
RUN cargo fetch

# Copy the full workspace (this layer is invalidated when sources change,
# but the dependency cache above stays intact).
COPY services services

ENTRYPOINT ["cargo", "run", "-p", "api-gateway"]
