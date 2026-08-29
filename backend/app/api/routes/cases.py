from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Case
from app.schemas.case import CaseRead


router = APIRouter()


@router.get("", response_model=dict)
def list_cases(
    query: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=100),
    db: Session = Depends(get_db),
):
    statement = select(Case)
    count_statement = select(func.count()).select_from(Case)
    if query:
        predicate = or_(
            Case.title.ilike(f"%{query}%"),
            Case.file_name.ilike(f"%{query}%"),
            Case.case_number.ilike(f"%{query}%"),
            Case.court_name.ilike(f"%{query}%"),
            Case.content.ilike(f"%{query}%"),
        )
        statement = statement.where(predicate)
        count_statement = count_statement.where(predicate)

    total = db.scalar(count_statement) or 0
    items = db.scalars(
        statement.order_by(Case.updated_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    return {
        "items": [CaseRead.model_validate(item).model_dump() for item in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/{case_id}", response_model=CaseRead)
def get_case(case_id: int, db: Session = Depends(get_db)):
    case = db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found.")
    return case


@router.get("/{case_id}/related", response_model=list[CaseRead])
def related_cases(case_id: int, limit: int = Query(default=4, ge=1, le=12), db: Session = Depends(get_db)):
    case = db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found.")

    statement = select(Case).where(Case.id != case.id)
    if case.category:
        statement = statement.where(Case.category == case.category)
    related = db.scalars(statement.order_by(Case.updated_at.desc()).limit(limit)).all()
    return related
