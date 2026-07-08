from pydantic import BaseModel, model_validator
from typing import Optional
from datetime import date, datetime
from decimal import Decimal
import uuid
from app.models.interaction_log import InteractionType, InteractionOutcome


class InteractionLogCreate(BaseModel):
    borrower_id: uuid.UUID
    interaction_type: InteractionType
    outcome: InteractionOutcome
    ptp_date: Optional[date] = None
    ptp_amount: Optional[Decimal] = None
    payment_amount: Optional[Decimal] = None
    note: Optional[str] = None
    is_offline_log: bool = False
    created_at: Optional[datetime] = None  # client timestamp for offline logs

    @model_validator(mode="after")
    def validate_ptp_fields(self):
        if self.outcome == InteractionOutcome.promise_to_pay:
            if not self.ptp_date:
                raise ValueError("ptp_date is required when outcome is promise_to_pay")
            if not self.ptp_amount:
                raise ValueError("ptp_amount is required when outcome is promise_to_pay")
        return self


class InteractionLogResponse(BaseModel):
    id: uuid.UUID
    borrower_id: uuid.UUID
    logged_by: uuid.UUID
    interaction_type: InteractionType
    outcome: InteractionOutcome
    ptp_date: Optional[date]
    ptp_amount: Optional[Decimal]
    ptp_broken: bool
    payment_amount: Optional[Decimal]
    note: Optional[str]
    is_offline_log: bool
    created_at: datetime
    server_created_at: datetime

    class Config:
        from_attributes = True