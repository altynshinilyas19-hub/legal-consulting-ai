from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Article
from app.schemas.article import ArticleRead


router = APIRouter()


@router.get("", response_model=dict)
def list_articles(
    kind: str | None = None,
    query: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=100),
    db: Session = Depends(get_db),
):
    statement = select(Article).where(Article.is_published.is_(True))
    count_statement = select(func.count()).select_from(Article).where(Article.is_published.is_(True))

    if kind:
        statement = statement.where(Article.kind == kind)
        count_statement = count_statement.where(Article.kind == kind)
    if query:
        predicate = Article.title.ilike(f"%{query}%") | Article.content.ilike(f"%{query}%")
        statement = statement.where(predicate)
        count_statement = count_statement.where(predicate)

    total = db.scalar(count_statement) or 0
    items = db.scalars(
        statement.order_by(Article.published_at.desc().nullslast(), Article.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return {
        "items": [ArticleRead.model_validate(item).model_dump() for item in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/{article_id}", response_model=ArticleRead)
def get_article(article_id: int, db: Session = Depends(get_db)):
    article = db.get(Article, article_id)
    if not article or not article.is_published:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found.")
    return article


@router.get("/slug/{slug}", response_model=ArticleRead)
def get_article_by_slug(slug: str, db: Session = Depends(get_db)):
    article = db.scalar(select(Article).where(Article.slug == slug, Article.is_published.is_(True)))
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found.")
    return article
