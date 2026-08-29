from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Favorite, User
from app.schemas.user import UserRead, UserUpdate
from app.services.chat_service import chat_summaries


router = APIRouter()


def serialize_favorite(item: Favorite) -> dict[str, object]:
    return {
        "id": item.id,
        "target_type": item.target_type,
        "target_id": item.target_id,
        "created_at": item.created_at,
    }


@router.get("/me", response_model=UserRead)
def me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserRead)
def update_me(payload: UserUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.avatar_url is not None:
        user.avatar_url = payload.avatar_url
    db.commit()
    db.refresh(user)
    return user


@router.get("/me/history")
def my_history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return chat_summaries(db, user.id)


@router.get("/me/favorites")
def my_favorites(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.scalars(select(Favorite).where(Favorite.user_id == user.id).order_by(Favorite.created_at.desc())).all()
    return [serialize_favorite(item) for item in items]


@router.post("/me/favorites")
def add_favorite(payload: dict, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    target_type = payload.get("target_type")
    target_id = str(payload.get("target_id", "")).strip()
    if not target_type or not target_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="target_type and target_id are required.")

    favorite = db.scalar(
        select(Favorite).where(
            Favorite.user_id == user.id,
            Favorite.target_type == target_type,
            Favorite.target_id == target_id,
        )
    )
    if favorite:
        return serialize_favorite(favorite)

    favorite = Favorite(user_id=user.id, target_type=target_type, target_id=target_id)
    db.add(favorite)
    db.commit()
    db.refresh(favorite)
    return serialize_favorite(favorite)


@router.delete("/me/favorites/{favorite_id}")
def remove_favorite(favorite_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    favorite = db.scalar(select(Favorite).where(Favorite.id == favorite_id, Favorite.user_id == user.id))
    if not favorite:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Favorite not found.")
    db.delete(favorite)
    db.commit()
    return {"success": True}
