from __future__ import annotations

from google.protobuf import struct_pb2

from internal.domain.health import HealthServicePort


class HealthHandler:
    def __init__(self, service: HealthServicePort):
        self._service = service

    def check(self, request, context):
        status = self._service.check()
        response = struct_pb2.Struct()
        response.update(
            {
                "service": status.service,
                "status": status.status,
                "database": "up" if status.database else "down",
            }
        )
        return response
