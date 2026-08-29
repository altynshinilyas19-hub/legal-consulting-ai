from __future__ import annotations

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import get_db
from app.models import User


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token.")

    token = authorization.split(" ", 1)[1]
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token.")

    user = db.get(User, int(payload["sub"]))
    if not user or not user.is_active or user.is_blocked:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User unavailable.")
    return user


def get_admin_user(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")
    return user
