from __future__ import annotations

from internal.domain.health import HealthRepository, HealthServicePort, HealthStatus


class HealthService(HealthServicePort):
    def __init__(self, repository: HealthRepository, service_name: str):
        self._repository = repository
        self._service_name = service_name

    def check(self) -> HealthStatus:
        database_ok = self._repository.ping()
        status = "healthy" if database_ok else "degraded"
        return HealthStatus(service=self._service_name, status=status, database=database_ok)
