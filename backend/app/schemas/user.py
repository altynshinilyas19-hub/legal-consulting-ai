from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.schemas.common import ORMModel


class UserRead(ORMModel):
    id: int
    email: str
    full_name: str | None = None
    avatar_url: str | None = None
    role: str
    is_active: bool
    is_blocked: bool
    created_at: datetime


class UserUpdate(BaseModel):
    full_name: str | None = None
    avatar_url: str | None = None
