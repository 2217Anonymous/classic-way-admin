from functools import lru_cache

from pydantic import EmailStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Valaiyagam E-commerce Admin API"
    app_env: str = "development"
    api_v1_prefix: str = "/api/v1"
    secret_key: str = "change-this-secret-in-production"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 30
    cors_origins: str = "http://localhost:3000,http://localhost:3001"

    # Full SQLAlchemy URL. When unset, composed from POSTGRES_* below.
    database_url: str | None = None

    postgres_host: str = "localhost"
    postgres_port: int = 5434
    postgres_db: str = "classic_way"
    postgres_user: str = "classic_way"
    postgres_password: str = "classic_way"

    initial_admin_email: EmailStr = "admin@example.com"
    initial_admin_password: str = "ChangeMe123!"
    initial_admin_name: str = "System Admin"

    payment_provider: str = "cod"
    payment_secret: str = ""
    # Prefer env STORAGE_PROVIDER. Default local for safe local development.
    storage_provider: str = "local"
    local_upload_root: str = "uploads"
    max_image_upload_size_mb: int = 10

    # AWS S3 (used when STORAGE_PROVIDER=s3). Never expose secrets to the frontend.
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "ap-south-1"
    aws_s3_bucket_name: str = ""
    aws_s3_public_base_url: str = ""
    aws_cloudfront_domain: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator(
        "storage_provider",
        "aws_access_key_id",
        "aws_secret_access_key",
        "aws_region",
        "aws_s3_bucket_name",
        "aws_s3_public_base_url",
        "aws_cloudfront_domain",
        "local_upload_root",
        mode="before",
    )
    @classmethod
    def _strip_strings(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value

    @property
    def max_image_upload_bytes(self) -> int:
        return max(1, self.max_image_upload_size_mb) * 1024 * 1024

    def sqlalchemy_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        return (
            f"postgresql+psycopg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
