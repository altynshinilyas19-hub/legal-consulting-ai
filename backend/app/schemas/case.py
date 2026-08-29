from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class CaseRead(ORMModel):
    id: int
    file_name: str
    title: str | None = None
    case_number: str | None = None
    court_name: str | None = None
    category: str | None = None
    region: str | None = None
    source_url: str | None = None
    decision_date: date | None = None
    excerpt: str | None = None
    content: str
    case_metadata: dict
    created_at: datetime
    updated_at: datetime


class CaseCreate(BaseModel):
    file_name: str
    title: str | None = None
    case_number: str | None = None
    court_name: str | None = None
    category: str | None = None
    region: str | None = None
    source_url: str | None = None
    excerpt: str | None = None
    content: str = Field(min_length=10)
    case_metadata: dict = Field(default_factory=dict)


class CaseUpdate(BaseModel):
    file_name: str | None = None
    title: str | None = None
    case_number: str | None = None
    court_name: str | None = None
    category: str | None = None
    region: str | None = None
    source_url: str | None = None
    decision_date: date | None = None
    excerpt: str | None = None
    content: str | None = Field(default=None, min_length=10)
    case_metadata: dict | None = None
