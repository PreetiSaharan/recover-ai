import uuid
from sqlalchemy import Column, String, Date, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base import Base
import enum


class AssignmentType(str, enum.Enum):
    telecall = "telecall"
    field_visit = "field_visit"


class AssignmentStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    unactioned = "unactioned"


class CaseAssignment(Base):
    __tablename__ = "case_assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    borrower_id = Column(UUID(as_uuid=True), ForeignKey("borrowers.id"), nullable=False)
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    assigned_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    nbfc_id = Column(UUID(as_uuid=True), ForeignKey("nbfcs.id"), nullable=True)
    assignment_type = Column(SAEnum(AssignmentType), nullable=False, default=AssignmentType.telecall)
    date = Column(Date, nullable=False)
    status = Column(SAEnum(AssignmentStatus), nullable=False, default=AssignmentStatus.pending)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)