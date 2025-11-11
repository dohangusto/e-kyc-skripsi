from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True)
class HealthStatus:
    service: str
    status: str
    database: bool


class HealthRepository(ABC):
    @abstractmethod
    def ping(self) -> bool:
        raise NotImplementedError


class HealthServicePort(ABC):
    @abstractmethod
    def check(self) -> HealthStatus:
        raise NotImplementedError
