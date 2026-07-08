import uuid
from sqlalchemy import Column, String, Boolean, Date, DateTime, ForeignKey, Enum as SAEnum, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base import Base
import enum


class InteractionType(str, enum.Enum):
    telecall = "telecall"
    field_visit = "field_visit"
    whatsapp_outbound = "whatsapp_outbound"
    system = "system"


class InteractionOutcome(str, enum.Enum):
    promise_to_pay = "promise_to_pay"
    not_reachable = "not_reachable"
    dispute = "dispute"
    already_paid = "already_paid"
    payment_collected = "payment_collected"
    not_found = "not_found"
    refused = "refused"
    message_sent = "message_sent"
    message_delivered = "message_delivered"
    message_read = "message_read"


class InteractionLog(Base):
    __tablename__ = "interaction_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    borrower_id = Column(UUID(as_uuid=True), ForeignKey("borrowers.id"), nullable=False)
    nbfc_id = Column(UUID(as_uuid=True), ForeignKey("nbfcs.id"), nullable=True)
    logged_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    interaction_type = Column(SAEnum(InteractionType), nullable=False)
    outcome = Column(SAEnum(InteractionOutcome), nullable=False)
    ptp_date = Column(Date, nullable=True)
    ptp_amount = Column(Numeric(12, 2), nullable=True)
    ptp_broken = Column(Boolean, default=False)
    payment_amount = Column(Numeric(12, 2), nullable=True)
    note = Column(String(100), nullable=True)
    is_offline_log = Column(Boolean, default=False)
    synced_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    server_created_at = Column(DateTime(timezone=True), server_default=func.now())