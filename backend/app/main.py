from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import UTC, datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select

from app.api.routes import api_router
from app.api.routes.chats import public_router
from app.core.config import get_settings
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models import Article, Lawyer, User


settings = get_settings()


def seed_defaults() -> None:
    db = SessionLocal()
    try:
        admin = db.scalar(select(User).where(User.email == settings.default_admin_email.lower()))
        if not admin:
            db.add(
                User(
                    email=settings.default_admin_email.lower(),
                    full_name="Platform Admin",
                    hashed_password=hash_password(settings.default_admin_password),
                    role="admin",
                )
            )

        lawyers_total = db.scalar(select(func.count()).select_from(Lawyer)) or 0
        if lawyers_total == 0:
            db.add_all(
                [
                    Lawyer(
                        name="Elena Sokolova",
                        specialization="Corporate law",
                        description=(
                            "Supports complex corporate disputes, risk audits, and strategic legal planning "
                            "for founders and in-house teams."
                        ),
                        experience_years=12,
                        rating=4.9,
                        contacts={"email": "sokolova@yuristconsultat.ru", "phone": "+7 (900) 111-22-33"},
                        consultation_price=15000,
                        photo_url="/images/lawyer-placeholder-1.svg",
                    ),
                    Lawyer(
                        name="Ilya Romanov",
                        specialization="Arbitration and insolvency",
                        description=(
                            "Leads high-stakes commercial disputes, insolvency strategy, and asset-protection matters "
                            "across Russian courts."
                        ),
                        experience_years=9,
                        rating=4.8,
                        contacts={"email": "romanov@yuristconsultat.ru", "phone": "+7 (900) 444-55-66"},
                        consultation_price=12000,
                        photo_url="/images/lawyer-placeholder-2.svg",
                    ),
                    Lawyer(
                        name="Anna Vorontsova",
                        specialization="Employment law",
                        description=(
                            "Advises on workforce disputes, executive exits, internal investigations, and labor "
                            "inspections for growing companies."
                        ),
                        experience_years=7,
                        rating=4.7,
                        contacts={"email": "vorontsova@yuristconsultat.ru", "phone": "+7 (900) 777-88-99"},
                        consultation_price=9000,
                        photo_url="/images/lawyer-placeholder-3.svg",
                    ),
                ]
            )

        articles_total = db.scalar(select(func.count()).select_from(Article)) or 0
        if articles_total == 0:
            now = datetime.now(UTC)
            db.add_all(
                [
                    Article(
                        title="How AI accelerates judicial research",
                        slug="ai-judicial-research",
                        kind="news",
                        excerpt=(
                            "A practical look at how legal AI reduces manual case review and helps teams reach stronger "
                            "positions faster."
                        ),
                        content=(
                            "The platform helps teams structure incoming legal questions, identify similar matters in "
                            "PostgreSQL, and produce concise legal takeaways grounded in real judicial materials."
                        ),
                        is_published=True,
                        published_at=now,
                    ),
                    Article(
                        title="Five signals a dispute needs precedent analysis",
                        slug="precedent-analysis-signals",
                        kind="article",
                        excerpt=(
                            "When intuition is no longer enough and the legal team needs evidence from comparable court outcomes."
                        ),
                        content=(
                            "Precedent analysis matters most in commercial, labor, and governance disputes where small factual "
                            "differences change the legal outcome and settlement posture."
                        ),
                        is_published=True,
                        published_at=now,
                    ),
                ]
            )

        db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    seed_defaults()
    yield


app = FastAPI(title=settings.app_name, debug=settings.debug, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(public_router)
app.include_router(api_router, prefix=settings.api_prefix)


@app.get("/health")
def health():
    return {"status": "ok", "service": settings.app_name}
