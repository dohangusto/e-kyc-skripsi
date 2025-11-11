from __future__ import annotations

import signal
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from internal.infrastructure.database.postgres import PostgresDatabase
from internal.infrastructure.grpc.server import GrpcServer
from internal.infrastructure.http.server import HttpServer
from internal.infrastructure.repository.health_repository import HealthRepositoryImpl
from internal.service.health_service import HealthService
from pkg.types.config import AppConfig


def build_servers() -> tuple[GrpcServer, HttpServer]:
    config = AppConfig.from_env()
    database = PostgresDatabase(config.database_dsn)
    repository = HealthRepositoryImpl(database)
    service = HealthService(repository, config.service_name)
    grpc_server = GrpcServer(config.grpc_bind, service)
    http_server = HttpServer(config.http_bind, service)
    return grpc_server, http_server


def main() -> None:
    grpc_server, http_server = build_servers()

    def shutdown(signum, frame):
        http_server.stop()
        grpc_server.stop()
        sys.exit(0)

    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)
    http_server.start()
    grpc_server.start()
    grpc_server.wait()


if __name__ == "__main__":
    main()
