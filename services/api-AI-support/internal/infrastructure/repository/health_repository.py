from __future__ import annotations

from internal.domain.health import HealthRepository
from internal.infrastructure.database.postgres import PostgresDatabase


class HealthRepositoryImpl(HealthRepository):
    def __init__(self, database: PostgresDatabase):
        self._database = database

    def ping(self) -> bool:
        with self._database.connection() as conn:
            cursor = conn.cursor()
            try:
                cursor.execute("SELECT 1")
                cursor.fetchone()
                return True
            finally:
                cursor.close()
