from __future__ import annotations

import importlib
from contextlib import contextmanager
from typing import Iterator


class PostgresDatabase:
    def __init__(self, dsn: str):
        self._dsn = dsn
        self._driver = importlib.import_module("psycopg")

    @contextmanager
    def connection(self) -> Iterator[object]:
        conn = self._driver.connect(self._dsn)
        try:
            conn.autocommit = True
            yield conn
        finally:
            conn.close()
