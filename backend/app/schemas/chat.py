from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class ChatCreate(BaseModel):
    title: str | None = None


class ChatUpdate(BaseModel):
    title: str = Field(min_length=1, max_length=255)


class ChatMessageCreate(BaseModel):
    message: str = Field(min_length=1)


class ConsultRequest(BaseModel):
    message: str = Field(min_length=1)


class CaseSnippet(BaseModel):
    id: int
    file_name: str
    snippet: str


class MessageRead(BaseModel):
    id: str
    role: str
    content: str
    meta: dict
    created_at: datetime


class ChatRead(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    messages: list[MessageRead]


class ChatSummary(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    preview: str | None = None
    messages_count: int


class ConsultResponse(BaseModel):
    answer: str
    cases: list[CaseSnippet]
    keywords: list[str] = []
    cases_found: int = 0
