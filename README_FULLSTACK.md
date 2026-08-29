# LexHarbor AI Fullstack

## Stack

- `frontend/`: Next.js 15 + TypeScript + TailwindCSS
- `backend/`: FastAPI + SQLAlchemy + PostgreSQL
- auth: JWT access tokens + refresh tokens
- AI integration: root `ai.py`

## Main areas

- public landing page
- AI chat with history and streaming
- cases catalog and detail page
- lawyers catalog and detail page
- user dashboard, favorites, settings
- admin overview, users, lawyers, articles, cases

## Local run

1. Copy `.env.example` to `.env`
2. Fill in database and AI credentials
3. Start PostgreSQL
4. Start backend:

```powershell
cd "C:\Users\liraa\Desktop\диплом\backend"
py -m pip install -r requirements.txt
py -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

5. Start frontend:

```powershell
cd "C:\Users\liraa\Desktop\диплом\frontend"
npm install
npm run dev
```

Frontend: `http://localhost:3000`  
Backend: `http://localhost:8000`

## Docker

```powershell
cd "C:\Users\liraa\Desktop\диплом"
copy .env.example .env
docker compose up --build
```

## Notes

- backend seeds a default admin plus starter lawyers/articles on first run
- frontend expects API at `NEXT_PUBLIC_API_URL`
- `ai.py` stays the source for legal AI reasoning and PostgreSQL search logic
