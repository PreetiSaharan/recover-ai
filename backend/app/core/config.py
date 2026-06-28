## Reads all settings from .env

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    DATABASE_URL: str = ""

    # Redis
    REDIS_URL: str

    # MinIO
    MINIO_ROOT_USER: str
    MINIO_ROOT_PASSWORD: str

    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 8

    # App
    ENVIRONMENT: str = "development"

    def model_post_init(self, __context):
        if not self.DATABASE_URL:
            object.__setattr__(
                self,
                "DATABASE_URL",
                f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@localhost:5432/{self.POSTGRES_DB}"
            )

    class Config:
        env_file = "../.env"


settings = Settings()