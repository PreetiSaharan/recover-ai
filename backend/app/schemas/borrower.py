from pydantic import BaseModel
from typing import Optional
from decimal import Decimal
from datetime import date, datetime
import uuid
from app.models.borrower import PreferredLanguage, SmaBucket, PriorityAction


class BorrowerCreate(BaseModel):
    loan_account_number: str
    full_name: str
    phone_number: str
    state: Optional[str] = None
    preferred_language: Optional[PreferredLanguage] = None
    emi_amount: Optional[Decimal] = None
    outstanding_balance: Optional[Decimal] = None
    due_date: Optional[date] = None
    dpd_days: Optional[int] = None
    last_payment_date: Optional[date] = None
    last_payment_amount: Optional[Decimal] = None

class BorrowerResponse(BaseModel):
    id: uuid.UUID
    loan_account_number: str
    full_name: str
    phone_number: str
    state: Optional[str]
    preferred_language: Optional[PreferredLanguage]
    emi_amount: Optional[Decimal]
    outstanding_balance: Optional[Decimal]
    due_date: Optional[date]
    dpd_days: Optional[int]
    sma_bucket: Optional[SmaBucket]
    priority_score: Optional[Decimal]
    priority_reason: Optional[str]
    priority_action: Optional[PriorityAction]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True