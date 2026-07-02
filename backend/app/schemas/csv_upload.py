from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid
from app.models.csv_upload import UploadStatus


class CsvUploadResponse(BaseModel):
    id: uuid.UUID
    status: UploadStatus
    row_count: Optional[int]
    ingested_count: Optional[int]
    skipped_count: Optional[int]
    minio_object_key: str
    created_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True