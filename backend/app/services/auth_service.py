from __future__ import annotations

from datetime import timedelta

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_token_id,
    hash_password,
    utc_now,
    verify_password,
)
from app.models import RefreshToken, User


def create_user(db: Session, *, email: str, password: str, full_name: str | None = None) -> User:
    existing = db.scalar(select(User).where(User.email == email.lower()))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered.")

    user = User(
        email=email.lower(),
        hashed_password=hash_password(password),
        full_name=full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, *, email: str, password: str) -> User:
    user = db.scalar(select(User).where(User.email == email.lower()))
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials.")
    if user.is_blocked:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is blocked.")
    return user


def create_token_pair(db: Session, *, user: User, user_agent: str | None = None, ip_address: str | None = None) -> dict:
    settings = get_settings()
    refresh_id = generate_token_id()
    refresh_expires = utc_now() + timedelta(days=settings.refresh_token_expire_days)
    db.add(
        RefreshToken(
            id=refresh_id,
            user_id=user.id,
            expires_at=refresh_expires,
            user_agent=user_agent,
            ip_address=ip_address,
        )
    )
    db.commit()
    return {
        "access_token": create_access_token(subject=str(user.id), role=user.role),
        "refresh_token": create_refresh_token(
            subject=str(user.id),
            role=user.role,
            token_id=refresh_id,
            expires_at=refresh_expires,
        ),
        "token_type": "bearer",
    }


def refresh_tokens(db: Session, refresh_token: str, user_agent: str | None = None, ip_address: str | None = None) -> dict:
    payload = decode_token(refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token.")

    token_row = db.get(RefreshToken, payload.get("jti"))
    if not token_row or token_row.revoked_at or token_row.expires_at <= utc_now():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired.")

    user = db.get(User, int(payload["sub"]))
    if not user or user.is_blocked:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not available.")

    token_row.revoked_at = utc_now()
    db.commit()
    return create_token_pair(db, user=user, user_agent=user_agent, ip_address=ip_address)


def revoke_refresh_token(db: Session, refresh_token: str) -> None:
    payload = decode_token(refresh_token)
    if payload.get("type") != "refresh":
        return

    token_row = db.get(RefreshToken, payload.get("jti"))
    if token_row and not token_row.revoked_at:
        token_row.revoked_at = utc_now()
        db.commit()
