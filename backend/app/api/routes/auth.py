from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.auth import AuthResponse, LoginRequest, RefreshRequest, RegisterRequest
from app.schemas.user import UserRead
from app.services.auth_service import (
    authenticate_user,
    create_token_pair,
    create_user,
    refresh_tokens,
    revoke_refresh_token,
)


router = APIRouter()


def _auth_payload(user, tokens):
    return {"user": UserRead.model_validate(user).model_dump(), "tokens": tokens}


@router.post("/register", response_model=AuthResponse)
def register(payload: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    user = create_user(db, email=payload.email, password=payload.password, full_name=payload.full_name)
    tokens = create_token_pair(
        db,
        user=user,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )
    return _auth_payload(user, tokens)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = authenticate_user(db, email=payload.email, password=payload.password)
    tokens = create_token_pair(
        db,
        user=user,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )
    return _auth_payload(user, tokens)


@router.post("/refresh")
def refresh(payload: RefreshRequest, request: Request, db: Session = Depends(get_db)):
    tokens = refresh_tokens(
        db,
        payload.refresh_token,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )
    return tokens


@router.post("/logout")
def logout(payload: RefreshRequest, db: Session = Depends(get_db)):
    revoke_refresh_token(db, payload.refresh_token)
    return {"success": True}
