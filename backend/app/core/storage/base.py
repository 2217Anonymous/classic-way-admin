from __future__ import annotations

from abc import ABC, abstractmethod
from typing import BinaryIO


class StorageProvider(ABC):
    """Abstract storage backend for product media and related assets."""

    @abstractmethod
    def save_bytes(self, key: str, data: bytes, *, content_type: str | None = None) -> str:
        """Persist bytes at key. Returns the storage key."""

    @abstractmethod
    def save_file(
        self, key: str, fileobj: BinaryIO, *, content_type: str | None = None
    ) -> str:
        """Persist a file-like object at key. Returns the storage key."""

    @abstractmethod
    def read_bytes(self, key: str) -> bytes:
        """Read object bytes by key."""

    @abstractmethod
    def delete(self, key: str) -> None:
        """Delete a single object. Missing keys are ignored."""

    @abstractmethod
    def delete_many(self, keys: list[str]) -> None:
        """Delete multiple objects. Missing keys are ignored."""

    @abstractmethod
    def exists(self, key: str) -> bool:
        """Return True if the object exists."""

    @abstractmethod
    def get_url(self, key: str) -> str:
        """Build a public/serving URL for the given storage key."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Provider identifier stored on media rows (`local` or `s3`)."""
