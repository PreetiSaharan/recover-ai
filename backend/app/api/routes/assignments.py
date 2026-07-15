from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.borrower import Borrower
from app.models.case_assignment import CaseAssignment, AssignmentStatus
from app.schemas.case_assignment import (
    AssignRequest, BulkAssignRequest, AssignmentResponse
)

router = APIRouter()


@router.post("/", response_model=AssignmentResponse, status_code=201)
def assign_borrower(
    payload: AssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    borrower = db.query(Borrower).filter(Borrower.id == payload.borrower_id).first()
    if not borrower:
        raise HTTPException(status_code=404, detail="Borrower not found")

    # check if already assigned today — update instead of creating duplicate
    today = date.today()
    existing = db.query(CaseAssignment).filter(
        CaseAssignment.borrower_id == payload.borrower_id,
        CaseAssignment.date == today,
    ).first()

    if existing:
        existing.assigned_to = payload.assigned_to
        existing.assigned_by = current_user.id
        existing.assignment_type = payload.assignment_type
        existing.status = AssignmentStatus.pending
        db.commit()
        db.refresh(existing)
        return existing

    assignment = CaseAssignment(
        borrower_id=payload.borrower_id,
        assigned_to=payload.assigned_to,
        assigned_by=current_user.id,
        nbfc_id=borrower.nbfc_id,
        assignment_type=payload.assignment_type,
        date=today,
        status=AssignmentStatus.pending,
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


@router.post("/bulk", response_model=List[AssignmentResponse])
def bulk_assign(
    payload: BulkAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    results = []

    for borrower_id in payload.borrower_ids:
        borrower = db.query(Borrower).filter(Borrower.id == borrower_id).first()
        if not borrower:
            continue

        existing = db.query(CaseAssignment).filter(
            CaseAssignment.borrower_id == borrower_id,
            CaseAssignment.date == today,
        ).first()

        if existing:
            existing.assigned_to = payload.assigned_to
            existing.assigned_by = current_user.id
            existing.assignment_type = payload.assignment_type
            existing.status = AssignmentStatus.pending
            db.commit()
            db.refresh(existing)
            results.append(existing)
        else:
            assignment = CaseAssignment(
                borrower_id=borrower_id,
                assigned_to=payload.assigned_to,
                assigned_by=current_user.id,
                nbfc_id=borrower.nbfc_id,
                assignment_type=payload.assignment_type,
                date=today,
                status=AssignmentStatus.pending,
            )
            db.add(assignment)
            db.commit()
            db.refresh(assignment)
            results.append(assignment)

    return results


@router.get("/today", response_model=List[AssignmentResponse])
def get_today_assignments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    return db.query(CaseAssignment).filter(
        CaseAssignment.date == today,
    ).all()


@router.get("/", response_model=List[AssignmentResponse])
def get_assignments_for_date(
    assignment_date: Optional[date] = Query(None, alias="date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    target_date = assignment_date or date.today()
    return db.query(CaseAssignment).filter(
        CaseAssignment.date == target_date,
    ).all()


@router.patch("/{borrower_id}/status")
def update_assignment_status(
    borrower_id: str,
    status: AssignmentStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    assignment = db.query(CaseAssignment).filter(
        CaseAssignment.borrower_id == borrower_id,
        CaseAssignment.date == today,
    ).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    assignment.status = status
    db.commit()
    return {"status": "updated"}