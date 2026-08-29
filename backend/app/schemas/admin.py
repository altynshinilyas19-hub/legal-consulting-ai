from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class AdminOverview(BaseModel):
    users_total: int
    blocked_users: int
    chats_total: int
    messages_total: int
    ai_requests_total: int
    cases_total: int
    lawyers_total: int
    articles_total: int
    admin_logs_total: int


class AdminLogRead(BaseModel):
    id: str
    admin_id: int | None = None
    action: str
    target_type: str
    target_id: str | None = None
    payload: dict
    created_at: datetime
