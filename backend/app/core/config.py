from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database — use DATABASE_URL directly in production
    DATABASE_URL: str
    POSTGRES_USER: Optional[str] = None
    POSTGRES_PASSWORD: Optional[str] = None
    POSTGRES_DB: Optional[str] = None

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: Optional[str] = None
    REDIS_URL: Optional[str] = None

    # MinIO — only needed in local dev
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ROOT_USER: Optional[str] = None
    MINIO_ROOT_PASSWORD: Optional[str] = None

    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 8

    # App
    ENVIRONMENT: str = "development"
    USE_MINIO: bool = False

    class Config:
        env_file = "../.env"


settings = Settings()