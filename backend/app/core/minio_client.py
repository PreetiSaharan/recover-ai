from minio import Minio
from app.core.config import settings

def get_minio_client() -> Minio:
    return Minio(
        endpoint=settings.MINIO_ENDPOINT,
        access_key=settings.MINIO_ROOT_USER,
        secret_key=settings.MINIO_ROOT_PASSWORD,
        secure=False,  # no HTTPS in local dev
    )

BUCKET_NAME = "recoverai-uploads"