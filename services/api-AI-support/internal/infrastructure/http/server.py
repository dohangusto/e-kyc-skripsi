from __future__ import annotations

from socket import getaddrinfo, SOCK_STREAM
from threading import Thread
from typing import Tuple
from http.server import ThreadingHTTPServer

from internal.domain.health import HealthServicePort
from internal.infrastructure.http.health_handler import HealthRequestHandler


class HttpServer:
    def __init__(self, bind: str, service: HealthServicePort):
        host, port = _parse_bind(bind)
        handler = type(
            "BoundHealthRequestHandler",
            (HealthRequestHandler,),
            {"service": service},
        )
        self._server = ThreadingHTTPServer((host, port), handler)
        self._thread: Thread | None = None

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._thread = Thread(target=self._server.serve_forever, daemon=True)
        self._thread.start()

    def wait(self) -> None:
        if self._thread:
            self._thread.join()

    def stop(self) -> None:
        self._server.shutdown()
        self._server.server_close()
        if self._thread:
            self._thread.join()


def _parse_bind(bind: str) -> Tuple[str, int]:
    if ":" not in bind:
        raise ValueError("bind must include host and port")
    host, port_str = bind.rsplit(":", 1)
    port = int(port_str)
    resolved = getaddrinfo(host if host else None, port, type=SOCK_STREAM)
    if not resolved:
        raise ValueError("unable to resolve bind")
    _, _, _, _, sockaddr = resolved[0]
    return sockaddr[0], sockaddr[1]
