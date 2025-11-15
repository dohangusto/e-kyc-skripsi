# syntax=docker/dockerfile:1.7
FROM python:3.11-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY services/api-AI-support/requirements.txt requirements.txt
# Reuse a pip cache between builds so dependencies are only downloaded once
RUN --mount=type=cache,target=/root/.cache/pip pip install -r requirements.txt
COPY services/api-AI-support services/api-AI-support
WORKDIR /app/services/api-AI-support
RUN python tools/bootstrap_models.py
ENTRYPOINT ["python", "cmd/main.py"]
