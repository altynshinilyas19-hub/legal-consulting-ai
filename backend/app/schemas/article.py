from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.schemas.common import ORMModel


class ArticleRead(ORMModel):
    id: int
    title: str
    slug: str
    kind: str
    excerpt: str | None = None
    content: str
    cover_image: str | None = None
    is_published: bool
    published_at: datetime | None = None
    author_id: int | None = None
    created_at: datetime
    updated_at: datetime


class ArticleCreate(BaseModel):
    title: str
    slug: str
    kind: str = "article"
    excerpt: str | None = None
    content: str
    cover_image: str | None = None
    is_published: bool = True


class ArticleUpdate(ArticleCreate):
    pass
