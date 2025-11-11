from __future__ import annotations

from concurrent import futures

import grpc
from google.protobuf import empty_pb2, struct_pb2

from internal.domain.health import HealthServicePort
from internal.infrastructure.grpc.health_handler import HealthHandler


class GrpcServer:
    def __init__(self, bind: str, service: HealthServicePort):
        self._bind = bind
        self._service = service
        self._server = grpc.server(futures.ThreadPoolExecutor(max_workers=4))
        self._register()

    def _register(self) -> None:
        handler = HealthHandler(self._service)
        method = grpc.unary_unary_rpc_method_handler(
            handler.check,
            request_deserializer=empty_pb2.Empty.FromString,
            response_serializer=struct_pb2.Struct.SerializeToString,
        )
        service = grpc.method_handlers_generic_handler("ai.support.Health", {"Check": method})
        self._server.add_generic_rpc_handlers((service,))
        self._server.add_insecure_port(self._bind)

    def start(self) -> None:
        self._server.start()

    def wait(self) -> None:
        self._server.wait_for_termination()

    def stop(self) -> None:
        self._server.stop(0).wait()
