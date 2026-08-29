from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class LawyerRead(ORMModel):
    id: int
    name: str
    photo_url: str | None = None
    specialization: str
    description: str
    experience_years: int
    rating: float
    contacts: dict
    consultation_price: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class LawyerCreate(BaseModel):
    name: str
    photo_url: str | None = None
    specialization: str
    description: str
    experience_years: int = Field(default=1, ge=0)
    rating: float = Field(default=5.0, ge=0, le=5)
    contacts: dict = Field(default_factory=dict)
    consultation_price: int = Field(default=0, ge=0)
    is_active: bool = True


class LawyerUpdate(LawyerCreate):
    pass
