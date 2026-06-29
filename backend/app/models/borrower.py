import uuid
from sqlalchemy import (
    Column, String, Numeric, Integer, Date,
    Boolean, DateTime, ForeignKey, Enum as SAEnum, text
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base import Base
import enum


class PreferredLanguage(str, enum.Enum):
    hindi = "hindi"
    english = "english"


class SmaBucket(str, enum.Enum):
    SMA_0 = "SMA-0"
    SMA_1 = "SMA-1"
    SMA_2 = "SMA-2"
    NPA = "NPA"


class PriorityAction(str, enum.Enum):
    telecaller_call = "telecaller_call"
    whatsapp = "whatsapp"
    field_visit = "field_visit"


class Borrower(Base):
    __tablename__ = "borrowers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nbfc_id = Column(UUID(as_uuid=True), ForeignKey("nbfcs.id"), nullable=True)  # nullable until nbfcs table exists
    loan_account_number = Column(String(100), nullable=False)
    full_name = Column(String(255), nullable=False)
    phone_number = Column(String(20), nullable=False)
    state = Column(String(100), nullable=True)
    preferred_language = Column(SAEnum(PreferredLanguage), nullable=True)
    emi_amount = Column(Numeric(12, 2), nullable=True)
    outstanding_balance = Column(Numeric(12, 2), nullable=True)
    due_date = Column(Date, nullable=True)
    dpd_days = Column(Integer, nullable=True)
    last_payment_date = Column(Date, nullable=True)
    last_payment_amount = Column(Numeric(12, 2), nullable=True)
    sma_bucket = Column(SAEnum(SmaBucket), nullable=True)
    priority_score = Column(Numeric(5, 2), nullable=True)
    priority_reason = Column(String, nullable=True)
    priority_action = Column(SAEnum(PriorityAction), nullable=True, server_default="telecaller_call")
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())