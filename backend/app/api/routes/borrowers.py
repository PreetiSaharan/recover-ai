from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.borrower import Borrower
from app.schemas.borrower import BorrowerCreate, BorrowerResponse

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