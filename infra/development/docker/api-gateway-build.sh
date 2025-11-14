#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$PROJECT_ROOT"

mkdir -p build/rust "$HOME/.cargo/registry" "$HOME/.cargo/git"

docker run --rm \
  -u "$(id -u)":"$(id -g)" \
  -v "$PWD":/app \
  -v "$HOME/.cargo/registry":/usr/local/cargo/registry \
  -v "$HOME/.cargo/git":/usr/local/cargo/git \
  -w /app \
  rustlang/rust:nightly \
  bash -lc "cargo build -p api-gateway --release && cp target/release/api-gateway build/rust/api-gateway"
