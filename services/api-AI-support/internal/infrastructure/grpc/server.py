from __future__ import annotations

from concurrent import futures

import grpc
from google.protobuf import empty_pb2, struct_pb2

from internal.domain.health import HealthServicePort
from internal.infrastructure.grpc.ekyc_handler import EkycGrpcHandler
from internal.infrastructure.grpc.health_handler import HealthHandler
from internal.proto.ekyc.v1 import ekyc_pb2_grpc


class GrpcServer:
    def __init__(self, bind: str, health_service: HealthServicePort, ekyc_handler: EkycGrpcHandler):
        self._bind = bind
        self._server = grpc.server(futures.ThreadPoolExecutor(max_workers=8))
        self._register_health(health_service)
        self._register_ekyc(ekyc_handler)
        self._server.add_insecure_port(self._bind)

    def _register_health(self, service: HealthServicePort) -> None:
        handler = HealthHandler(service)
        method = grpc.unary_unary_rpc_method_handler(
            handler.check,
            request_deserializer=empty_pb2.Empty.FromString,
            response_serializer=struct_pb2.Struct.SerializeToString,
        )
        service_def = grpc.method_handlers_generic_handler("ai.support.Health", {"Check": method})
        self._server.add_generic_rpc_handlers((service_def,))

    def _register_ekyc(self, handler: EkycGrpcHandler) -> None:
        ekyc_pb2_grpc.add_EkycSupportServiceServicer_to_server(handler, self._server)

    def start(self) -> None:
        self._server.start()

    def wait(self) -> None:
        self._server.wait_for_termination()

    def stop(self) -> None:
        self._server.stop(0).wait()
