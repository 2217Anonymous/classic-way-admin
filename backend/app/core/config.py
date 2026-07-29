from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import EmailStr, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve `.env` from the backend package root (not the process cwd).
_BACKEND_ROOT = Path(__file__).resolve().parents[2]
_ENV_FILE = _BACKEND_ROOT / ".env"

_INSECURE_SECRET_MARKERS = (
    "change-this-secret",
    "change-me",
    "dev-secret",
)


class Settings(BaseSettings):
    """Application settings loaded from environment variables / `backend/.env`.

    Sensitive values are not hardcoded here — set them in `.env`
    (see `.env.example`). Never commit real secrets.
    """

    app_name: str
    app_env: Literal["development", "staging", "production", "test"]
    api_v1_prefix: str

    # Every runtime value is required from the environment / `.env`.
    secret_key: str = Field(min_length=32)
    access_token_expire_minutes: int = Field(ge=1)
    refresh_token_expire_days: int = Field(ge=1)
    cors_origins: str

    postgres_host: str
    postgres_port: int = Field(ge=1, le=65535)
    postgres_db: str
    postgres_user: str
    postgres_password: str

    initial_admin_email: EmailStr
    initial_admin_password: str = Field(min_length=8)
    initial_admin_name: str

    payment_provider: str
    payment_secret: str

    storage_provider: Literal["local", "s3"]
    local_upload_root: str
    max_image_upload_size_mb: int = Field(ge=1, le=100)

    # AWS S3 (used when STORAGE_PROVIDER=s3). Never expose secrets to the frontend.
    aws_access_key_id: str
    aws_secret_access_key: str
    aws_region: str
    aws_s3_bucket_name: str
    aws_s3_public_base_url: str
    aws_cloudfront_domain: str

    model_config = SettingsConfigDict(
        env_file=_ENV_FILE,
        env_file_encoding="utf-8",
        env_ignore_empty=False,
        case_sensitive=False,
        extra="ignore",
    )

    @field_validator(
        "secret_key",
        "postgres_password",
        "initial_admin_password",
        "payment_secret",
        "storage_provider",
        "aws_access_key_id",
        "aws_secret_access_key",
        "aws_region",
        "aws_s3_bucket_name",
        "aws_s3_public_base_url",
        "aws_cloudfront_domain",
        "local_upload_root",
        "cors_origins",
        "app_name",
        "api_v1_prefix",
        "postgres_host",
        "postgres_db",
        "postgres_user",
        "initial_admin_name",
        "payment_provider",
        mode="before",
    )
    @classmethod
    def _strip_strings(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("storage_provider", mode="before")
    @classmethod
    def _normalize_storage_provider(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip().lower()
        return value

    @model_validator(mode="after")
    def _validate_security_and_storage(self) -> Settings:
        secret = self.secret_key.strip()
        if len(secret) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters")

        if self.app_env == "production":
            lowered = secret.lower()
            if any(marker in lowered for marker in _INSECURE_SECRET_MARKERS):
                raise ValueError(
                    "SECRET_KEY looks insecure for production; set a strong random value"
                )
            if self.initial_admin_password in {"ChangeMe123!", "password", "admin"}:
                raise ValueError(
                    "INITIAL_ADMIN_PASSWORD must not use a default value in production"
                )
            if self.postgres_password in {"classic_way", "postgres", "password"}:
                raise ValueError(
                    "POSTGRES_PASSWORD must not use a default value in production"
                )

        if self.storage_provider == "s3":
            if not self.aws_s3_bucket_name:
                raise ValueError(
                    "AWS_S3_BUCKET_NAME is required when STORAGE_PROVIDER=s3"
                )
            if not self.aws_region:
                raise ValueError("AWS_REGION is required when STORAGE_PROVIDER=s3")
            # Keys may be omitted when using IAM instance/task roles.
            has_key = bool(self.aws_access_key_id)
            has_secret = bool(self.aws_secret_access_key)
            if has_key != has_secret:
                raise ValueError(
                    "Set both AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY, "
                    "or leave both empty to use the default AWS credential chain"
                )

        return self

    @property
    def max_image_upload_bytes(self) -> int:
        return max(1, self.max_image_upload_size_mb) * 1024 * 1024

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    def sqlalchemy_database_url(self) -> str:
        return (
            f"postgresql+psycopg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def cors_origin_list(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.cors_origins.split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
