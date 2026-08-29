from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Chat, Message, User
from app.schemas.chat import (
    ChatCreate,
    ChatMessageCreate,
    ChatRead,
    ChatSummary,
    ChatUpdate,
    ConsultRequest,
    ConsultResponse,
)
from app.services.ai_service import run_ai_consultation
from app.services.chat_service import (
    chat_summaries,
    persist_consultation,
    serialize_message,
    stream_chat_consultation,
    stream_consultation,
)


router = APIRouter()
public_router = APIRouter()


def _chat_payload(chat: Chat, messages: list[Message]) -> dict:
    return {
        "id": chat.id,
        "title": chat.title,
        "created_at": chat.created_at,
        "updated_at": chat.updated_at,
        "messages": [serialize_message(message) for message in messages],
    }


def _get_chat_or_404(db: Session, *, chat_id: str, user_id: int) -> Chat:
    chat = db.scalar(select(Chat).where(Chat.id == chat_id, Chat.user_id == user_id))
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found.")
    return chat


@public_router.post("/api/consult", response_model=ConsultResponse)
def consult(payload: ConsultRequest):
    return run_ai_consultation(payload.message, [])


@public_router.post("/api/consult/stream")
def consult_stream(payload: ConsultRequest):
    return stream_consultation(payload.message)


@router.post("/consult", response_model=ConsultResponse)
def consult_v1(payload: ConsultRequest):
    return run_ai_consultation(payload.message, [])


@router.post("/consult/stream")
def consult_v1_stream(payload: ConsultRequest):
    return stream_consultation(payload.message)


@router.get("/chats", response_model=list[ChatSummary])
def list_chats(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return chat_summaries(db, user.id)


@router.post("/chats", response_model=ChatRead)
def create_chat(payload: ChatCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    chat = Chat(user_id=user.id, title=payload.title or "New consultation")
    db.add(chat)
    db.commit()
    db.refresh(chat)
    return _chat_payload(chat, [])


@router.get("/chats/{chat_id}", response_model=ChatRead)
def get_chat(chat_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    chat = _get_chat_or_404(db, chat_id=chat_id, user_id=user.id)
    messages = db.scalars(
        select(Message).where(Message.chat_id == chat.id).order_by(Message.created_at.asc())
    ).all()
    return _chat_payload(chat, messages)


@router.patch("/chats/{chat_id}", response_model=ChatRead)
def rename_chat(
    chat_id: str,
    payload: ChatUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    chat = _get_chat_or_404(db, chat_id=chat_id, user_id=user.id)
    chat.title = payload.title.strip()
    db.commit()
    db.refresh(chat)
    messages = db.scalars(
        select(Message).where(Message.chat_id == chat.id).order_by(Message.created_at.asc())
    ).all()
    return _chat_payload(chat, messages)


@router.delete("/chats/{chat_id}")
def delete_chat(chat_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    chat = _get_chat_or_404(db, chat_id=chat_id, user_id=user.id)
    db.delete(chat)
    db.commit()
    return {"success": True}


@router.post("/chats/{chat_id}/messages")
def send_message(
    chat_id: str,
    payload: ChatMessageCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    chat = _get_chat_or_404(db, chat_id=chat_id, user_id=user.id)
    outcome = persist_consultation(db, chat=chat, user_id=user.id, message=payload.message)
    return {
        "chat_id": chat.id,
        "user_message": serialize_message(outcome["user_message"]),
        "assistant_message": serialize_message(outcome["assistant_message"]),
        "result": outcome["result"],
    }


@router.post("/chats/{chat_id}/stream")
def send_message_stream(
    chat_id: str,
    payload: ChatMessageCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    chat = _get_chat_or_404(db, chat_id=chat_id, user_id=user.id)
    return stream_chat_consultation(db, chat=chat, user_id=user.id, message=payload.message)
