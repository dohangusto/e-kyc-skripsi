from __future__ import annotations

import signal
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from internal.infrastructure.ai.easyocr_provider import EasyOcrProvider
from internal.infrastructure.ai.facenet_embedder import FaceNetEmbedder
from internal.infrastructure.ai.mediapipe_liveness import MediaPipeGestureDetector
from internal.infrastructure.database.postgres import PostgresDatabase
from internal.infrastructure.events.face_match_publisher import (
    RabbitFaceMatchResultPublisher,
    RabbitFaceMatchTaskPublisher,
)
from internal.infrastructure.events.face_match_worker import FaceMatchWorker
from internal.infrastructure.events.liveness_publisher import (
    RabbitLivenessResultPublisher,
    RabbitLivenessTaskPublisher,
)
from internal.infrastructure.events.liveness_worker import LivenessWorker
from internal.infrastructure.events.rabbitmq import (
    RabbitMqConnectionFactory,
    RabbitMqPublisher,
)
from internal.infrastructure.grpc.ekyc_handler import EkycGrpcHandler
from internal.infrastructure.grpc.server import GrpcServer
from internal.infrastructure.http.server import HttpServer
from internal.infrastructure.repository.health_repository import HealthRepositoryImpl
from internal.service.ekyc_service import EkycService
from internal.service.face_match_service import FaceMatchService
from internal.service.health_service import HealthService
from internal.service.liveness_service import LivenessService
from pkg.types.config import AppConfig


def build_runtime() -> tuple[
    GrpcServer,
    HttpServer,
    tuple[FaceMatchWorker, LivenessWorker],
    MediaPipeGestureDetector,
]:
    config = AppConfig.from_env()
    database = PostgresDatabase(config.database_dsn)
    repository = HealthRepositoryImpl(database)
    service = HealthService(repository, config.service_name)
    rabbit_factory = RabbitMqConnectionFactory(config.rabbitmq_url)
    rabbit_publisher = RabbitMqPublisher(rabbit_factory)

    ocr_provider = EasyOcrProvider(config.ocr_languages)
    face_embedder = FaceNetEmbedder(device=config.torch_device)
    gesture_detector = MediaPipeGestureDetector(
        min_detection_confidence=config.mediapipe_min_confidence
    )

    face_match_service = FaceMatchService(face_embedder)
    liveness_service = LivenessService(gesture_detector)

    face_task_publisher = RabbitFaceMatchTaskPublisher(
        rabbit_publisher, config.face_match_queue
    )
    liveness_task_publisher = RabbitLivenessTaskPublisher(
        rabbit_publisher, config.liveness_queue
    )

    face_result_publisher = RabbitFaceMatchResultPublisher(
        rabbit_publisher, config.face_match_result_queue
    )
    liveness_result_publisher = RabbitLivenessResultPublisher(
        rabbit_publisher, config.liveness_result_queue
    )

    face_worker = FaceMatchWorker(
        config.face_match_queue,
        rabbit_factory,
        face_match_service,
        face_result_publisher,
    )
    liveness_worker = LivenessWorker(
        config.liveness_queue,
        rabbit_factory,
        liveness_service,
        liveness_result_publisher,
    )

    ekyc_service = EkycService(face_task_publisher, liveness_task_publisher)
    ekyc_handler = EkycGrpcHandler(
        ekyc_service, ocr_provider, config.default_face_threshold
    )

    grpc_server = GrpcServer(config.grpc_bind, service, ekyc_handler)
    http_server = HttpServer(config.http_bind, service)
    return grpc_server, http_server, (face_worker, liveness_worker), gesture_detector


def main() -> None:
    grpc_server, http_server, workers, gesture_detector = build_runtime()

    for worker in workers:
        worker.start()

    def shutdown(signum, frame):
        http_server.stop()
        grpc_server.stop()
        gesture_detector.close()
        for worker in workers:
            worker.stop()
        sys.exit(0)

    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)
    http_server.start()
    grpc_server.start()
    grpc_server.wait()


if __name__ == "__main__":
    main()
