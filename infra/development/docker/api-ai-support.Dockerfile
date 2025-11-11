FROM python:3.11-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
COPY services/api-AI-support/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY services/api-AI-support services/api-AI-support
WORKDIR /app/services/api-AI-support
ENTRYPOINT ["python", "cmd/main.py"]
