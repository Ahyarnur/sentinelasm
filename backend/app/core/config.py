"""Application settings loaded from environment / .env."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "SentinelASM"
    api_prefix: str = "/api/v1"

    # Security
    secret_key: str = "change-me-to-a-random-long-string"
    access_token_expire_minutes: int = 60
    algorithm: str = "HS256"
    # Registrasi publik. Matikan (false) saat API diekspos ke internet: hanya user
    # pertama yang boleh dibuat lewat /auth/register (bootstrap admin).
    allow_registration: bool = True

    # Infrastructure
    database_url: str = "postgresql+psycopg://sentinel:sentinel@localhost:5432/sentinelasm"
    redis_url: str = "redis://localhost:6379/0"

    # Behaviour
    auto_create_tables: bool = True
    cors_origins: list[str] = ["http://localhost:3000"]
    artifacts_dir: str = "./artifacts"

    # Scanning
    scan_max_concurrency: int = 10
    nuclei_severity: str = "critical,high,medium"
    port_scan_top: int = 1000
    mock_scanners: bool = True
    enable_active_scanning: bool = False

    # Enrichment
    enable_enrichment: bool = True
    nvd_api_key: str | None = None
    epss_api_url: str = "https://api.first.org/data/v1/epss"
    nvd_api_url: str = "https://services.nvd.nist.gov/rest/json/cves/2.0"

    # External services
    slack_webhook_url: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
