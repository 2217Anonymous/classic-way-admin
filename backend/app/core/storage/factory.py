from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from app.core.config import settings
from app.core.storage.base import StorageProvider
from app.core.storage.local import LocalStorageProvider
from app.core.storage.s3 import S3StorageProvider


@lru_cache
def get_storage_provider() -> StorageProvider:
    provider = (settings.storage_provider or "local").strip().lower()
    if provider == "s3":
        return S3StorageProvider(
            bucket=settings.aws_s3_bucket_name,
            region=settings.aws_region,
            access_key_id=settings.aws_access_key_id or None,
            secret_access_key=settings.aws_secret_access_key or None,
            public_base_url=settings.aws_s3_public_base_url or None,
            cloudfront_domain=settings.aws_cloudfront_domain or None,
        )
    if provider == "local":
        return LocalStorageProvider(Path(settings.local_upload_root))
    raise ValueError(f"Unsupported STORAGE_PROVIDER: {settings.storage_provider}")


def reset_storage_provider_cache() -> None:
    get_storage_provider.cache_clear()
