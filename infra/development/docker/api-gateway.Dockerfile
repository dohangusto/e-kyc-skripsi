# syntax=docker/dockerfile:1.7
FROM rust:1.80
WORKDIR /app

# Cache dependency downloads
COPY Cargo.toml Cargo.lock ./
COPY services services
RUN rustup toolchain install nightly && rustup default nightly && cargo fetch

ENTRYPOINT ["cargo", "run", "-p", "api-gateway"]
