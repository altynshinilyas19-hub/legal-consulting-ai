from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "ЮристКонсультат"
    environment: str = "development"
    debug: bool = True
    api_prefix: str = "/api/v1"
    secret_key: str = Field("change-me-super-secret", alias="SECRET_KEY")
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 14
    database_url: str = Field(
        "postgresql+psycopg://postgres:1231@localhost:5432/legal_consulting",
        alias="DATABASE_URL",
    )
    legal_db_dsn: str = Field(
        "dbname=legal_consulting user=postgres password=1231 host=localhost port=5432",
        alias="LEGAL_DB_DSN",
    )
    legal_ai_api_key: str = Field("", alias="LEGAL_AI_API_KEY")
    legal_ai_base_url: str = Field("https://codex.sale/v1", alias="LEGAL_AI_BASE_URL")
    legal_ai_model: str = Field("gpt-5.4", alias="LEGAL_AI_MODEL")
    frontend_url: str = Field("http://localhost:3000", alias="FRONTEND_URL")
    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]
    )
    default_admin_email: str = Field("admin@lexharbor.ai", alias="DEFAULT_ADMIN_EMAIL")
    default_admin_password: str = Field("Admin12345!", alias="DEFAULT_ADMIN_PASSWORD")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value):
        if isinstance(value, str):
            raw = value.strip()
            if not raw:
                return []
            if raw.startswith("["):
                return value
            return [item.strip() for item in raw.split(",") if item.strip()]
        return value

    @field_validator("debug", mode="before")
    @classmethod
    def parse_debug(cls, value):
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"1", "true", "yes", "on", "debug", "development", "dev"}:
                return True
            if normalized in {"0", "false", "no", "off", "release", "production", "prod"}:
                return False
        return value

    @property
    def project_root(self) -> Path:
        return Path(__file__).resolve().parents[3]


@lru_cache
def get_settings() -> Settings:
    return Settings()
