from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
