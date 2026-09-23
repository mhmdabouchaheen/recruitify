from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    ai_provider: str | None = None
    ai_model: str | None = None
    ai_api_key: str | None = None
    contract_company_name: str = "Recruitify"
    smtp_email: str | None = None
    smtp_app_password: str | None = None
    cv_storage_backend: str = "local"
    cv_storage_bucket: str | None = None
    cv_storage_prefix: str = "cvs"
    aws_endpoint_url_s3: str | None = None
    aws_region: str | None = None
    cors_allowed_origins: str = (
        "http://127.0.0.1:5173,"
        "http://127.0.0.1:5174,"
        "http://localhost:5173,"
        "http://localhost:5174"
    )

    @property
    def cors_allowed_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allowed_origins.split(",") if origin.strip()]

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

