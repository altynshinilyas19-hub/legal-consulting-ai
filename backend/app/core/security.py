from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import jwt
from fastapi import HTTPException, status

from app.core.config import get_settings


PASSWORD_ITERATIONS = 240_000
ALGORITHM = "HS256"


def utc_now() -> datetime:
    return datetime.now(UTC)


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt_bytes = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt_bytes,
        PASSWORD_ITERATIONS,
    )
    return f"pbkdf2_sha256${PASSWORD_ITERATIONS}${salt_bytes.hex()}${digest.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        algorithm, iterations_text, salt_hex, digest_hex = password_hash.split("$", 3)
    except ValueError:
        return False

    if algorithm != "pbkdf2_sha256":
        return False

    candidate = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(salt_hex),
        int(iterations_text),
    ).hex()
    return hmac.compare_digest(candidate, digest_hex)


def create_access_token(*, subject: str, role: str) -> str:
    settings = get_settings()
    expires_at = utc_now() + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "sub": subject,
        "role": role,
        "type": "access",
        "exp": expires_at,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def create_refresh_token(*, subject: str, role: str, token_id: str, expires_at: datetime) -> str:
    settings = get_settings()
    payload = {
        "sub": subject,
        "role": role,
        "jti": token_id,
        "type": "refresh",
        "exp": expires_at,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    settings = get_settings()
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    except jwt.PyJWTError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
        ) from error


def generate_token_id() -> str:
    return uuid4().hex
