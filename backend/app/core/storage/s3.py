from __future__ import annotations

import logging
from typing import BinaryIO

import boto3
from botocore.exceptions import ClientError

from app.core.storage.base import StorageProvider

logger = logging.getLogger(__name__)


class S3StorageProvider(StorageProvider):
    """AWS S3 storage with centralized public URL generation."""

    def __init__(
        self,
        *,
        bucket: str,
        region: str,
        access_key_id: str | None = None,
        secret_access_key: str | None = None,
        public_base_url: str | None = None,
        cloudfront_domain: str | None = None,
    ) -> None:
        if not bucket:
            raise ValueError("AWS_S3_BUCKET_NAME is required when STORAGE_PROVIDER=s3")
        self.bucket = bucket
        self.region = region or "ap-south-1"
        self.public_base_url = (public_base_url or "").rstrip("/")
        self.cloudfront_domain = (cloudfront_domain or "").strip().rstrip("/")

        session_kwargs: dict[str, str] = {}
        if access_key_id and secret_access_key:
            session_kwargs["aws_access_key_id"] = access_key_id
            session_kwargs["aws_secret_access_key"] = secret_access_key

        self._client = boto3.client(
            "s3",
            region_name=self.region,
            **session_kwargs,
        )

    @property
    def provider_name(self) -> str:
        return "s3"

    def save_bytes(self, key: str, data: bytes, *, content_type: str | None = None) -> str:
        normalized = key.replace("\\", "/").lstrip("/")
        extra: dict[str, str] = {}
        if content_type:
            extra["ContentType"] = content_type
        self._client.put_object(
            Bucket=self.bucket,
            Key=normalized,
            Body=data,
            **extra,
        )
        return normalized

    def save_file(
        self, key: str, fileobj: BinaryIO, *, content_type: str | None = None
    ) -> str:
        return self.save_bytes(key, fileobj.read(), content_type=content_type)

    def read_bytes(self, key: str) -> bytes:
        normalized = key.replace("\\", "/").lstrip("/")
        try:
            response = self._client.get_object(Bucket=self.bucket, Key=normalized)
        except ClientError as exc:
            code = exc.response.get("Error", {}).get("Code", "")
            if code in {"404", "NoSuchKey", "NotFound"}:
                raise FileNotFoundError(normalized) from exc
            raise
        return response["Body"].read()

    def delete(self, key: str) -> None:
        normalized = key.replace("\\", "/").lstrip("/")
        try:
            self._client.delete_object(Bucket=self.bucket, Key=normalized)
        except ClientError:
            logger.exception("Failed to delete S3 object %s", normalized)

    def delete_many(self, keys: list[str]) -> None:
        normalized = [key.replace("\\", "/").lstrip("/") for key in keys if key]
        if not normalized:
            return
        # S3 delete_objects accepts up to 1000 keys per call.
        for start in range(0, len(normalized), 1000):
            chunk = normalized[start : start + 1000]
            try:
                self._client.delete_objects(
                    Bucket=self.bucket,
                    Delete={"Objects": [{"Key": key} for key in chunk], "Quiet": True},
                )
            except ClientError:
                logger.exception("Failed to delete S3 objects batch starting at %s", start)
                for key in chunk:
                    self.delete(key)

    def exists(self, key: str) -> bool:
        normalized = key.replace("\\", "/").lstrip("/")
        try:
            self._client.head_object(Bucket=self.bucket, Key=normalized)
            return True
        except ClientError as exc:
            code = exc.response.get("Error", {}).get("Code", "")
            if code in {"404", "NoSuchKey", "NotFound", "404 Not Found"}:
                return False
            raise

    def get_url(self, key: str) -> str:
        normalized = key.replace("\\", "/").lstrip("/")
        if self.cloudfront_domain:
            domain = self.cloudfront_domain
            if domain.startswith("http://") or domain.startswith("https://"):
                return f"{domain}/{normalized}"
            return f"https://{domain}/{normalized}"
        if self.public_base_url:
            return f"{self.public_base_url}/{normalized}"
        return f"https://{self.bucket}.s3.{self.region}.amazonaws.com/{normalized}"
