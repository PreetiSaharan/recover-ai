from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.borrower import Borrower
from app.schemas.borrower import BorrowerCreate, BorrowerResponse 
from typing import Optional

router = APIRouter()


@router.post("/", response_model=BorrowerResponse, status_code=status.HTTP_201_CREATED)
def create_borrower(
    payload: BorrowerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    borrower = Borrower(**payload.model_dump())
    db.add(borrower)
    db.commit()
    db.refresh(borrower)
    return borrower


@router.get("/", response_model=List[BorrowerResponse])
def list_borrowers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Borrower).filter(Borrower.is_active == True).all()


@router.get("/ranked", response_model=List[BorrowerResponse])
def get_ranked_borrowers(
    sma_bucket: Optional[str] = Query(None, description="Filter by SMA bucket: SMA-0, SMA-1, SMA-2, NPA"),
    priority_action: Optional[str] = Query(None, description="Filter by action: telecaller_call, whatsapp, field_visit"),
    min_outstanding: Optional[float] = Query(None, description="Minimum outstanding balance"),
    max_outstanding: Optional[float] = Query(None, description="Maximum outstanding balance"),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Borrower).filter(Borrower.is_active == True)

    if sma_bucket:
        query = query.filter(Borrower.sma_bucket == sma_bucket)

    if priority_action:
        query = query.filter(Borrower.priority_action == priority_action)

    if min_outstanding is not None:
        query = query.filter(Borrower.outstanding_balance >= min_outstanding)

    if max_outstanding is not None:
        query = query.filter(Borrower.outstanding_balance <= max_outstanding)

    # rank by DPD descending — most overdue first
    query = query.order_by(Borrower.dpd_days.desc())

    return query.offset(offset).limit(limit).all()


@router.get("/{borrower_id}", response_model=BorrowerResponse)
def get_borrower(
    borrower_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    borrower = db.query(Borrower).filter(Borrower.id == borrower_id).first()
    if not borrower:
        raise HTTPException(status_code=404, detail="Borrower not found")
    return borrower


@router.patch("/{borrower_id}", response_model=BorrowerResponse)
def update_borrower(
    borrower_id: uuid.UUID,
    payload: BorrowerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    borrower = db.query(Borrower).filter(Borrower.id == borrower_id).first()
    if not borrower:
        raise HTTPException(status_code=404, detail="Borrower not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(borrower, field, value)
    db.commit()
    db.refresh(borrower)
    return borrower


@router.delete("/{borrower_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_borrower(
    borrower_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    borrower = db.query(Borrower).filter(Borrower.id == borrower_id).first()
    if not borrower:
        raise HTTPException(status_code=404, detail="Borrower not found")
    borrower.is_active = False  # soft delete — never hard delete borrower records
    db.commit()

