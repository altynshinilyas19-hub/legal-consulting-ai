from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_admin_user
from app.db.session import get_db
from app.models import AdminLog, Article, Case, Chat, Lawyer, Message, User
from app.schemas.admin import AdminLogRead, AdminOverview
from app.schemas.article import ArticleCreate, ArticleRead, ArticleUpdate
from app.schemas.case import CaseCreate, CaseRead, CaseUpdate
from app.schemas.lawyer import LawyerCreate, LawyerRead, LawyerUpdate


router = APIRouter()


def log_action(db: Session, *, admin_id: int, action: str, target_type: str, target_id: str | None, payload: dict | None = None):
    db.add(
        AdminLog(
            admin_id=admin_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            payload=payload or {},
        )
    )
    db.commit()


@router.get("/overview", response_model=AdminOverview)
def overview(admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    return {
        "users_total": db.scalar(select(func.count()).select_from(User)) or 0,
        "blocked_users": db.scalar(select(func.count()).select_from(User).where(User.is_blocked.is_(True))) or 0,
        "chats_total": db.scalar(select(func.count()).select_from(Chat)) or 0,
        "messages_total": db.scalar(select(func.count()).select_from(Message)) or 0,
        "ai_requests_total": db.scalar(
            select(func.count()).select_from(AdminLog).where(AdminLog.action == "ai_consultation")
        )
        or 0,
        "cases_total": db.scalar(select(func.count()).select_from(Case)) or 0,
        "lawyers_total": db.scalar(select(func.count()).select_from(Lawyer)) or 0,
        "articles_total": db.scalar(select(func.count()).select_from(Article)) or 0,
        "admin_logs_total": db.scalar(select(func.count()).select_from(AdminLog)) or 0,
    }


@router.get("/logs", response_model=list[AdminLogRead])
def logs(limit: int = Query(default=50, ge=1, le=200), admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    return db.scalars(select(AdminLog).order_by(AdminLog.created_at.desc()).limit(limit)).all()


@router.get("/users")
def users(admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(User).order_by(User.created_at.desc())).all()
    return [
        {
            "id": row.id,
            "email": row.email,
            "full_name": row.full_name,
            "role": row.role,
            "is_active": row.is_active,
            "is_blocked": row.is_blocked,
            "created_at": row.created_at,
        }
        for row in rows
    ]


@router.get("/lawyers", response_model=list[LawyerRead])
def admin_lawyers(admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    return db.scalars(select(Lawyer).order_by(Lawyer.updated_at.desc())).all()


@router.get("/articles", response_model=list[ArticleRead])
def admin_articles(admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    return db.scalars(select(Article).order_by(Article.updated_at.desc())).all()


@router.get("/cases", response_model=list[CaseRead])
def admin_cases(
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
    query: str | None = None,
):
    statement = select(Case)
    if query:
        statement = statement.where(
            Case.file_name.ilike(f"%{query}%")
            | Case.title.ilike(f"%{query}%")
            | Case.content.ilike(f"%{query}%")
        )
    return db.scalars(statement.order_by(Case.updated_at.desc()).limit(200)).all()


@router.patch("/users/{user_id}")
def update_user(user_id: int, payload: dict, admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    if "is_blocked" in payload:
        user.is_blocked = bool(payload["is_blocked"])
    if "role" in payload and payload["role"] in {"user", "admin"}:
        user.role = payload["role"]
    db.commit()
    db.refresh(user)
    log_action(db, admin_id=admin.id, action="update_user", target_type="user", target_id=str(user.id), payload=payload)
    return {"success": True}


@router.post("/lawyers", response_model=LawyerRead)
def create_lawyer(payload: LawyerCreate, admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    lawyer = Lawyer(**payload.model_dump())
    db.add(lawyer)
    db.commit()
    db.refresh(lawyer)
    log_action(db, admin_id=admin.id, action="create_lawyer", target_type="lawyer", target_id=str(lawyer.id))
    return lawyer


@router.put("/lawyers/{lawyer_id}", response_model=LawyerRead)
def update_lawyer(lawyer_id: int, payload: LawyerUpdate, admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    lawyer = db.get(Lawyer, lawyer_id)
    if not lawyer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lawyer not found.")
    for key, value in payload.model_dump().items():
        setattr(lawyer, key, value)
    db.commit()
    db.refresh(lawyer)
    log_action(db, admin_id=admin.id, action="update_lawyer", target_type="lawyer", target_id=str(lawyer.id))
    return lawyer


@router.delete("/lawyers/{lawyer_id}")
def delete_lawyer(lawyer_id: int, admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    lawyer = db.get(Lawyer, lawyer_id)
    if not lawyer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lawyer not found.")
    db.delete(lawyer)
    db.commit()
    log_action(db, admin_id=admin.id, action="delete_lawyer", target_type="lawyer", target_id=str(lawyer_id))
    return {"success": True}


@router.post("/articles", response_model=ArticleRead)
def create_article(payload: ArticleCreate, admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    article = Article(
        **payload.model_dump(),
        author_id=admin.id,
        published_at=datetime.now(UTC) if payload.is_published else None,
    )
    db.add(article)
    db.commit()
    db.refresh(article)
    log_action(db, admin_id=admin.id, action="create_article", target_type="article", target_id=str(article.id))
    return article


@router.put("/articles/{article_id}", response_model=ArticleRead)
def update_article(article_id: int, payload: ArticleUpdate, admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    article = db.get(Article, article_id)
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found.")
    for key, value in payload.model_dump().items():
        setattr(article, key, value)
    article.published_at = datetime.now(UTC) if article.is_published else None
    db.commit()
    db.refresh(article)
    log_action(db, admin_id=admin.id, action="update_article", target_type="article", target_id=str(article.id))
    return article


@router.delete("/articles/{article_id}")
def delete_article(article_id: int, admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    article = db.get(Article, article_id)
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found.")
    db.delete(article)
    db.commit()
    log_action(db, admin_id=admin.id, action="delete_article", target_type="article", target_id=str(article_id))
    return {"success": True}


@router.post("/cases", response_model=CaseRead)
def create_case(payload: CaseCreate, admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    case = Case(**payload.model_dump())
    db.add(case)
    db.commit()
    db.refresh(case)
    log_action(db, admin_id=admin.id, action="create_case", target_type="case", target_id=str(case.id))
    return case


@router.put("/cases/{case_id}", response_model=CaseRead)
def update_case(
    case_id: int,
    payload: CaseUpdate,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    case = db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found.")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(case, key, value)
    db.commit()
    db.refresh(case)
    log_action(db, admin_id=admin.id, action="update_case", target_type="case", target_id=str(case.id))
    return case


@router.delete("/cases/{case_id}")
def delete_case(case_id: int, admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    case = db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found.")
    db.delete(case)
    db.commit()
    log_action(db, admin_id=admin.id, action="delete_case", target_type="case", target_id=str(case_id))
    return {"success": True}


@router.post("/cases/upload", response_model=CaseRead)
async def upload_case(
    file: UploadFile = File(...),
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    content = (await file.read()).decode("utf-8", errors="ignore")
    case = Case(
        file_name=file.filename or "uploaded_case.txt",
        title=file.filename or "Uploaded case",
        excerpt=content[:280],
        content=content,
    )
    db.add(case)
    db.commit()
    db.refresh(case)
    log_action(db, admin_id=admin.id, action="upload_case", target_type="case", target_id=str(case.id))
    return case
