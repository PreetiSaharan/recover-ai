import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from app.db.base import Base
import enum


class UploadStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    complete = "complete"
    failed = "failed"


class CsvUpload(Base):
    __tablename__ = "csv_uploads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nbfc_id = Column(UUID(as_uuid=True), ForeignKey("nbfcs.id"), nullable=True)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    minio_object_key = Column(String(500), nullable=False)
    row_count = Column(Integer, nullable=True)
    ingested_count = Column(Integer, nullable=True)
    skipped_count = Column(Integer, nullable=True)
    status = Column(SAEnum(UploadStatus), nullable=False, default=UploadStatus.pending)
    error_summary = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    processing_started_at = Column(DateTime(timezone=True), nullable=True)