"""Artifact storage abstraction (local filesystem by default).

Swap ``LocalStorage`` for an S3-backed implementation without touching callers.
"""
from __future__ import annotations

from pathlib import Path

from app.core.config import settings


class LocalStorage:
    def __init__(self, base: str | None = None) -> None:
        self.base = Path(base or settings.artifacts_dir)

    def save(self, relative_path: str, data: bytes) -> str:
        path = self.base / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return relative_path

    def read(self, relative_path: str) -> bytes:
        return (self.base / relative_path).read_bytes()

    def full_path(self, relative_path: str) -> Path:
        return self.base / relative_path


def get_storage() -> LocalStorage:
    return LocalStorage()
