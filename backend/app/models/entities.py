from __future__ import annotations

from datetime import date, datetime
from uuid import uuid4

from sqlalchemy import JSON, Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def uuid_value() -> str:
    return uuid4().hex


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(32), default="user", index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_blocked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    chats: Mapped[list["Chat"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    messages: Mapped[list["Message"]] = relationship(back_populates="user")
    favorites: Mapped[list["Favorite"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    admin_logs: Mapped[list["AdminLog"]] = relationship(back_populates="admin")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=uuid_value)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="refresh_tokens")


class Chat(Base):
    __tablename__ = "chats"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=uuid_value)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    user: Mapped["User"] = relationship(back_populates="chats")
    messages: Mapped[list["Message"]] = relationship(back_populates="chat", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=uuid_value)
    chat_id: Mapped[str] = mapped_column(ForeignKey("chats.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    role: Mapped[str] = mapped_column(String(32))
    content: Mapped[str] = mapped_column(Text)
    meta: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    chat: Mapped["Chat"] = relationship(back_populates="messages")
    user: Mapped["User | None"] = relationship(back_populates="messages")


class Case(Base):
    __tablename__ = "cases"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    file_name: Mapped[str] = mapped_column(String(255), index=True)
    title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    case_number: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    court_name: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    category: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    region: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    decision_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    excerpt: Mapped[str | None] = mapped_column(Text, nullable=True)
    content: Mapped[str] = mapped_column(Text)
    case_metadata: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


class Lawyer(Base):
    __tablename__ = "lawyers"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    specialization: Mapped[str] = mapped_column(String(255), index=True)
    description: Mapped[str] = mapped_column(Text)
    experience_years: Mapped[int] = mapped_column(Integer, default=1)
    rating: Mapped[float] = mapped_column(Float, default=5.0)
    contacts: Mapped[dict] = mapped_column(JSON, default=dict)
    consultation_price: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


class Article(Base):
    __tablename__ = "articles"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(500), index=True)
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    kind: Mapped[str] = mapped_column(String(32), default="article", index=True)
    excerpt: Mapped[str | None] = mapped_column(Text, nullable=True)
    content: Mapped[str] = mapped_column(Text)
    cover_image: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    author_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


class Favorite(Base):
    __tablename__ = "favorites"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=uuid_value)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    target_type: Mapped[str] = mapped_column(String(32), index=True)
    target_id: Mapped[str] = mapped_column(String(64), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="favorites")


class AdminLog(Base):
    __tablename__ = "admin_logs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=uuid_value)
    admin_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action: Mapped[str] = mapped_column(String(255), index=True)
    target_type: Mapped[str] = mapped_column(String(64), index=True)
    target_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    admin: Mapped["User | None"] = relationship(back_populates="admin_logs")
