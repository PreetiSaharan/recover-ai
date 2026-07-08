from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.borrower import Borrower
from app.models.interaction_log import InteractionLog
from app.schemas.interaction_log import InteractionLogCreate, InteractionLogResponse

router = APIRouter()


@router.post("/", response_model=InteractionLogResponse, status_code=201)
def log_interaction(
    payload: InteractionLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # verify borrower exists
    borrower = db.query(Borrower).filter(Borrower.id == payload.borrower_id).first()
    if not borrower:
        raise HTTPException(status_code=404, detail="Borrower not found")

    log = InteractionLog(
        borrower_id=payload.borrower_id,
        logged_by=current_user.id,
        interaction_type=payload.interaction_type,
        outcome=payload.outcome,
        ptp_date=payload.ptp_date,
        ptp_amount=payload.ptp_amount,
        payment_amount=payload.payment_amount,
        note=payload.note,
        is_offline_log=payload.is_offline_log,
    )

    # override created_at for offline logs
    if payload.is_offline_log and payload.created_at:
        log.created_at = payload.created_at

    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/{borrower_id}", response_model=List[InteractionLogResponse])
def get_interactions(
    borrower_id: uuid.UUID,
    limit: int = Query(5, le=50),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    borrower = db.query(Borrower).filter(Borrower.id == borrower_id).first()
    if not borrower:
        raise HTTPException(status_code=404, detail="Borrower not found")

    return (
        db.query(InteractionLog)
        .filter(InteractionLog.borrower_id == borrower_id)
        .order_by(InteractionLog.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )