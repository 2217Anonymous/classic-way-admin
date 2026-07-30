from __future__ import annotations

from pathlib import Path
from typing import BinaryIO

from app.core.storage.base import StorageProvider


class LocalStorageProvider(StorageProvider):
    """Filesystem storage under a root directory, served via `/uploads/...`."""

    def __init__(self, root: Path | str = "uploads") -> None:
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    @property
    def provider_name(self) -> str:
        return "local"

    def _path_for(self, key: str) -> Path:
        normalized = key.replace("\\", "/").lstrip("/")
        if ".." in normalized.split("/"):
            raise ValueError("Invalid storage key")
        path = (self.root / normalized).resolve()
        if not str(path).startswith(str(self.root.resolve())):
            raise ValueError("Invalid storage key")
        return path

    def save_bytes(self, key: str, data: bytes, *, content_type: str | None = None) -> str:
        path = self._path_for(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return key.replace("\\", "/").lstrip("/")

    def save_file(
        self, key: str, fileobj: BinaryIO, *, content_type: str | None = None
    ) -> str:
        return self.save_bytes(key, fileobj.read(), content_type=content_type)

    def read_bytes(self, key: str) -> bytes:
        path = self._path_for(key)
        if not path.is_file():
            raise FileNotFoundError(key)
        return path.read_bytes()

    def delete(self, key: str) -> None:
        path = self._path_for(key)
        if path.is_file():
            path.unlink()

    def delete_many(self, keys: list[str]) -> None:
        for key in keys:
            self.delete(key)

    def exists(self, key: str) -> bool:
        return self._path_for(key).is_file()

    def get_url(self, key: str) -> str:
        normalized = key.replace("\\", "/").lstrip("/")
        if normalized.startswith("uploads/"):
            return f"/{normalized}"
        return f"/uploads/{normalized}"
