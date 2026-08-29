from fastapi import APIRouter

from app.api.routes import admin, articles, auth, cases, chats, lawyers, users


api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(chats.router, prefix="", tags=["consult", "chats"])
api_router.include_router(cases.router, prefix="/cases", tags=["cases"])
api_router.include_router(lawyers.router, prefix="/lawyers", tags=["lawyers"])
api_router.include_router(articles.router, prefix="/articles", tags=["articles"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
