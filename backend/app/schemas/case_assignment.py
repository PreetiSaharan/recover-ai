from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
import uuid
from app.models.case_assignment import AssignmentType, AssignmentStatus


class AssignRequest(BaseModel):
    borrower_id: uuid.UUID
    assigned_to: uuid.UUID
    assignment_type: Optional[AssignmentType] = AssignmentType.telecall


class BulkAssignRequest(BaseModel):
    borrower_ids: List[uuid.UUID]
    assigned_to: uuid.UUID
    assignment_type: Optional[AssignmentType] = AssignmentType.telecall


class AssignmentResponse(BaseModel):
    id: uuid.UUID
    borrower_id: uuid.UUID
    assigned_to: uuid.UUID
    assigned_by: uuid.UUID
    assignment_type: AssignmentType
    date: date
    status: AssignmentStatus
    created_at: datetime

    class Config:
        from_attributes = True