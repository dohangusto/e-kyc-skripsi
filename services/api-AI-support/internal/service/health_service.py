from __future__ import annotations

from internal.domain.health import HealthRepository, HealthServicePort, HealthStatus


class HealthService(HealthServicePort):
    def __init__(
        self, repository: HealthRepository, service_name: str, vision_ready: bool = True
    ):
        self._repository = repository
        self._service_name = service_name
        self._vision_ready = vision_ready

    def check(self) -> HealthStatus:
        database_ok = self._repository.ping()
        status = "healthy" if database_ok and self._vision_ready else "degraded"
        return HealthStatus(
            service=self._service_name,
            status=status,
            database=database_ok,
            vision=self._vision_ready,
        )
