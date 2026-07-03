from arq.connections import RedisSettings
from app.worker.tasks import process_csv_upload
from app.core.config import settings


class WorkerSettings:
    functions = [process_csv_upload]
    redis_settings = RedisSettings(host=settings.REDIS_HOST, port=settings.REDIS_PORT)
    max_jobs = 2