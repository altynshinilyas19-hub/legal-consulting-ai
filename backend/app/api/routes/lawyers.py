from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Lawyer
from app.schemas.lawyer import LawyerRead


router = APIRouter()


@router.get("", response_model=dict)
def list_lawyers(
    query: str | None = None,
    specialization: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=100),
    db: Session = Depends(get_db),
):
    statement = select(Lawyer).where(Lawyer.is_active.is_(True))
    count_statement = select(func.count()).select_from(Lawyer).where(Lawyer.is_active.is_(True))

    if query:
        predicate = Lawyer.name.ilike(f"%{query}%") | Lawyer.description.ilike(f"%{query}%")
        statement = statement.where(predicate)
        count_statement = count_statement.where(predicate)

    if specialization:
        statement = statement.where(Lawyer.specialization.ilike(f"%{specialization}%"))
        count_statement = count_statement.where(Lawyer.specialization.ilike(f"%{specialization}%"))

    total = db.scalar(count_statement) or 0
    items = db.scalars(
        statement.order_by(Lawyer.rating.desc(), Lawyer.experience_years.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return {
        "items": [LawyerRead.model_validate(item).model_dump() for item in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/{lawyer_id}", response_model=LawyerRead)
def get_lawyer(lawyer_id: int, db: Session = Depends(get_db)):
    lawyer = db.get(Lawyer, lawyer_id)
    if not lawyer or not lawyer.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lawyer not found.")
    return lawyer
