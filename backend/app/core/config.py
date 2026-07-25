from functools import lru_cache

from pydantic import EmailStr
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
    storage_provider: str = "local"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    def sqlalchemy_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        # Sync SQLAlchemy driver: psycopg (v3). asyncpg is listed for async adoption.
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
