from __future__ import annotations

import json
import logging
import threading
import time
from typing import Any, Callable, Dict, Optional

import pika

logger = logging.getLogger(__name__)


class RabbitMqConnectionFactory:
    def __init__(self, url: str):
        self._parameters = pika.URLParameters(url)

    def connection(self) -> pika.BlockingConnection:
        return pika.BlockingConnection(self._parameters)


class RabbitMqPublisher:
    def __init__(self, factory: RabbitMqConnectionFactory):
        self._factory = factory

    def publish(self, queue: str, payload: Dict[str, Any], headers: Optional[Dict[str, Any]] = None) -> None:
        connection = self._factory.connection()
        try:
            channel = connection.channel()
            channel.queue_declare(queue=queue, durable=True)
            properties = pika.BasicProperties(
                content_type="application/json",
                delivery_mode=pika.spec.PERSISTENT_DELIVERY_MODE,
                headers=headers or {},
            )
            channel.basic_publish(
                exchange="",
                routing_key=queue,
                body=json.dumps(payload).encode("utf-8"),
                properties=properties,
            )
        finally:
            connection.close()


class RabbitMqWorker:
    def __init__(
        self,
        name: str,
        queue: str,
        factory: RabbitMqConnectionFactory,
        handler: Callable[[bytes, Optional[Dict[str, Any]]], None],
        prefetch_count: int = 1,
    ):
        self._name = name
        self._queue = queue
        self._factory = factory
        self._handler = handler
        self._prefetch = prefetch_count
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None
        self._connection: pika.BlockingConnection | None = None
        self._channel: pika.adapters.blocking_connection.BlockingChannel | None = None

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._thread = threading.Thread(target=self._run, name=f"{self._name}-worker", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        if self._channel and self._channel.is_open:
            try:
                self._channel.stop_consuming()
            except Exception:  # pragma: no cover - defensive
                pass
        if self._connection and self._connection.is_open:
            try:
                self._connection.close()
            except Exception:  # pragma: no cover
                pass
        if self._thread:
            self._thread.join(timeout=5)

    def _run(self) -> None:
        while not self._stop_event.is_set():
            try:
                self._connection = self._factory.connection()
                self._channel = self._connection.channel()
                self._channel.queue_declare(queue=self._queue, durable=True)
                self._channel.basic_qos(prefetch_count=self._prefetch)

                def _callback(ch, method, properties, body):
                    try:
                        headers = properties.headers if properties else None
                        self._handler(body, headers)
                        ch.basic_ack(delivery_tag=method.delivery_tag)
                    except Exception as exc:  # pragma: no cover - defensive
                        logger.exception("worker %s failed: %s", self._name, exc)
                        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

                self._channel.basic_consume(queue=self._queue, on_message_callback=_callback)
                logger.info("worker %s started consuming queue %s", self._name, self._queue)
                self._channel.start_consuming()
            except pika.exceptions.AMQPError as exc:
                if self._stop_event.is_set():
                    break
                logger.warning("worker %s lost connection: %s", self._name, exc)
                time.sleep(1.0)
            finally:
                self._close()

    def _close(self) -> None:
        if self._channel and self._channel.is_open:
            try:
                self._channel.close()
            except Exception:
                pass
        if self._connection and self._connection.is_open:
            try:
                self._connection.close()
            except Exception:
                pass
        self._channel = None
        self._connection = None
