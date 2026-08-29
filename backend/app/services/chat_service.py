from __future__ import annotations

import json
from collections.abc import Iterable

from fastapi.encoders import jsonable_encoder
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import utc_now
from app.models import AdminLog, Chat, Message
from app.services.ai_service import run_ai_consultation


def build_chat_title(message: str) -> str:
    clean = " ".join(message.split())
    if not clean:
        return "New consultation"
    return clean[:72] + ("..." if len(clean) > 72 else "")


def message_history(messages: Iterable[Message]) -> list[dict]:
    history = []
    for item in messages:
        history.append({"role": item.role, "content": item.content})
    return history[-8:]


def serialize_message(message: Message) -> dict:
    return {
        "id": message.id,
        "role": message.role,
        "content": message.content,
        "meta": message.meta or {},
        "created_at": message.created_at,
    }


def log_ai_usage(
    db: Session,
    *,
    user_id: int | None,
    chat_id: str | None,
    prompt: str,
    result: dict,
) -> None:
    db.add(
        AdminLog(
            admin_id=None,
            action="ai_consultation",
            target_type="chat" if chat_id else "consult",
            target_id=chat_id,
            payload={
                "user_id": user_id,
                "prompt_preview": prompt[:180],
                "keywords": result.get("keywords", []),
                "cases_found": result.get("cases_found", 0),
            },
        )
    )


def persist_consultation(db: Session, *, chat: Chat, user_id: int, message: str) -> dict:
    existing_messages = db.scalars(
        select(Message).where(Message.chat_id == chat.id).order_by(Message.created_at.asc())
    ).all()
    history = message_history(existing_messages)

    user_message = Message(chat_id=chat.id, user_id=user_id, role="user", content=message, meta={})
    db.add(user_message)
    db.flush()

    result = run_ai_consultation(message, history)
    assistant_message = Message(
        chat_id=chat.id,
        user_id=user_id,
        role="assistant",
        content=result.get("answer", ""),
        meta={
            "keywords": result.get("keywords", []),
            "cases": result.get("cases", []),
            "cases_found": result.get("cases_found", 0),
        },
    )
    db.add(assistant_message)
    log_ai_usage(db, user_id=user_id, chat_id=chat.id, prompt=message, result=result)
    chat.title = chat.title if existing_messages else build_chat_title(message)
    chat.updated_at = utc_now()
    db.commit()
    db.refresh(chat)
    db.refresh(user_message)
    db.refresh(assistant_message)
    return {"user_message": user_message, "assistant_message": assistant_message, "result": result}


def stream_consultation(message: str):
    result = run_ai_consultation(message, [])
    return _stream_result_payload(result)


def stream_chat_consultation(db: Session, *, chat: Chat, user_id: int, message: str):
    existing_messages = db.scalars(
        select(Message).where(Message.chat_id == chat.id).order_by(Message.created_at.asc())
    ).all()
    history = message_history(existing_messages)

    user_message = Message(chat_id=chat.id, user_id=user_id, role="user", content=message, meta={})
    db.add(user_message)
    db.commit()
    db.refresh(user_message)

    result = run_ai_consultation(message, history)
    assistant_message = Message(
        chat_id=chat.id,
        user_id=user_id,
        role="assistant",
        content=result.get("answer", ""),
        meta={
            "keywords": result.get("keywords", []),
            "cases": result.get("cases", []),
            "cases_found": result.get("cases_found", 0),
        },
    )
    db.add(assistant_message)
    log_ai_usage(db, user_id=user_id, chat_id=chat.id, prompt=message, result=result)
    chat.title = chat.title if existing_messages else build_chat_title(message)
    chat.updated_at = utc_now()
    db.commit()
    db.refresh(chat)
    db.refresh(assistant_message)

    payload = {
        **result,
        "chat_id": chat.id,
        "user_message": serialize_message(user_message),
        "assistant_message": serialize_message(assistant_message),
    }
    return _stream_result_payload(payload)


def _stream_result_payload(result: dict):
    chunks = []
    answer = result.get("answer", "")
    for index in range(0, len(answer), 48):
        chunks.append({"type": "chunk", "content": answer[index : index + 48]})
    chunks.append({"type": "cases", "content": result.get("cases", [])})
    chunks.append({"type": "done", "content": result})

    def event_source():
        for item in chunks:
            yield f"data: {json.dumps(jsonable_encoder(item), ensure_ascii=False)}\n\n"

    return StreamingResponse(event_source(), media_type="text/event-stream")


def chat_summaries(db: Session, user_id: int) -> list[dict]:
    messages_count = (
        select(func.count(Message.id))
        .where(Message.chat_id == Chat.id)
        .correlate(Chat)
        .scalar_subquery()
    )
    preview = (
        select(Message.content)
        .where(Message.chat_id == Chat.id)
        .order_by(Message.created_at.desc())
        .limit(1)
        .correlate(Chat)
        .scalar_subquery()
    )

    rows = db.execute(
        select(
            Chat.id,
            Chat.title,
            Chat.created_at,
            Chat.updated_at,
            messages_count.label("messages_count"),
            preview.label("preview"),
        )
        .where(Chat.user_id == user_id)
        .order_by(Chat.updated_at.desc())
    ).all()

    return [
        {
            "id": row.id,
            "title": row.title,
            "created_at": row.created_at,
            "updated_at": row.updated_at,
            "messages_count": row.messages_count or 0,
            "preview": (row.preview or "")[:140],
        }
        for row in rows
    ]
