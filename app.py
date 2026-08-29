import hashlib
import json
import mimetypes
import os
import re
import secrets
import threading
import uuid
from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

import psycopg
from psycopg.rows import dict_row

from ai import DB_DSN, run_consultation


BASE_DIR = Path(__file__).resolve().parent
WEB_DIR = BASE_DIR / "web"
SESSION_COOKIE_NAME = "lexconsult_session"
SESSION_TTL_DAYS = 30
PASSWORD_ITERATIONS = 240_000
EMAIL_RE = re.compile(r"^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$", re.IGNORECASE)
DB_LOCK = threading.Lock()
CAPTCHA_TTL_MINUTES = 7


class APIError(Exception):
    def __init__(self, status_code, message):
        super().__init__(message)
        self.status_code = status_code
        self.message = message


def utc_now():
    return datetime.now(timezone.utc)


def utc_now_iso():
    return utc_now().isoformat()


def db_connect():
    return psycopg.connect(DB_DSN, row_factory=dict_row)


def initialize_database():
    schema = """
    CREATE TABLE IF NOT EXISTS app_users (
        id BIGSERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS app_sessions (
        token TEXT PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_chats (
        id TEXT PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS app_messages (
        id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL REFERENCES app_chats(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        meta JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_app_sessions_user_id ON app_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_app_chats_user_id_updated ON app_chats(user_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_app_messages_chat_id_created ON app_messages(chat_id, created_at ASC);
    """

    with db_connect() as conn:
        with conn.cursor() as cur:
            cur.execute(schema)


def normalize_email(email):
    return email.strip().lower()


def validate_email(email):
    normalized = normalize_email(email)
    if not normalized or not EMAIL_RE.match(normalized):
        raise APIError(HTTPStatus.BAD_REQUEST, "Введите корректный email.")
    return normalized


def validate_password(password, password_repeat=None):
    if len(password) < 8:
        raise APIError(HTTPStatus.BAD_REQUEST, "Пароль должен быть не короче 8 символов.")
    if password_repeat is not None and password != password_repeat:
        raise APIError(HTTPStatus.BAD_REQUEST, "Пароли не совпадают.")


def build_password_hash(password, salt=None):
    salt_bytes = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt_bytes,
        PASSWORD_ITERATIONS,
    )
    return f"pbkdf2_sha256${PASSWORD_ITERATIONS}${salt_bytes.hex()}${digest.hex()}"


def verify_password(password, stored_hash):
    try:
        algorithm, iterations_text, salt_hex, digest_hex = stored_hash.split("$", 3)
    except ValueError:
        return False

    if algorithm != "pbkdf2_sha256":
        return False

    computed_digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(salt_hex),
        int(iterations_text),
    ).hex()

    return secrets.compare_digest(computed_digest, digest_hex)


def create_session_token():
    return secrets.token_urlsafe(32)


def build_chat_title(problem_text):
    normalized = " ".join(problem_text.split())
    if not normalized:
        return "Новый чат"
    return normalized[:52] + ("..." if len(normalized) > 52 else "")


def serialize_user(user):
    return {
        "id": user["id"],
        "email": user["email"],
        "created_at": user["created_at"].isoformat(),
    }


def serialize_chat_summary(row):
    return {
        "id": row["id"],
        "title": row["title"],
        "created_at": row["created_at"].isoformat(),
        "updated_at": row["updated_at"].isoformat(),
        "messages_count": row["messages_count"],
        "preview": row["preview"] or "",
    }


def serialize_message(row):
    return {
        "id": row["id"],
        "role": row["role"],
        "content": row["content"],
        "meta": row["meta"] or {},
        "created_at": row["created_at"].isoformat(),
    }


def serialize_chat(chat_row, message_rows):
    return {
        "id": chat_row["id"],
        "title": chat_row["title"],
        "created_at": chat_row["created_at"].isoformat(),
        "updated_at": chat_row["updated_at"].isoformat(),
        "messages": [serialize_message(message) for message in message_rows],
    }


def generate_captcha():
    left = secrets.randbelow(8) + 2
    right = secrets.randbelow(8) + 1
    if secrets.randbelow(2) == 0:
        return {
            "id": f"cap_{uuid.uuid4().hex[:10]}",
            "question": f"{left} + {right}",
            "answer": str(left + right),
            "expires_at": utc_now() + timedelta(minutes=CAPTCHA_TTL_MINUTES),
        }

    if right > left:
        left, right = right, left

    return {
        "id": f"cap_{uuid.uuid4().hex[:10]}",
        "question": f"{left} - {right}",
        "answer": str(left - right),
        "expires_at": utc_now() + timedelta(minutes=CAPTCHA_TTL_MINUTES),
    }


CAPTCHA_STORE = {}


def issue_captcha():
    challenge = generate_captcha()
    CAPTCHA_STORE[challenge["id"]] = challenge

    expired = [
        key
        for key, value in CAPTCHA_STORE.items()
        if value["expires_at"] <= utc_now()
    ]
    for key in expired:
        CAPTCHA_STORE.pop(key, None)

    return {
        "captcha_id": challenge["id"],
        "question": challenge["question"],
    }


def verify_captcha(captcha_id, answer):
    if not captcha_id or not answer:
        raise APIError(HTTPStatus.BAD_REQUEST, "Заполни капчу.")

    challenge = CAPTCHA_STORE.pop(captcha_id, None)
    if not challenge or challenge["expires_at"] <= utc_now():
        raise APIError(HTTPStatus.BAD_REQUEST, "Капча устарела. Обнови её.")

    if challenge["answer"] != str(answer).strip():
        raise APIError(HTTPStatus.BAD_REQUEST, "Капча введена неверно.")


def get_session_cookie_header(token):
    cookie = SimpleCookie()
    cookie[SESSION_COOKIE_NAME] = token
    cookie[SESSION_COOKIE_NAME]["path"] = "/"
    cookie[SESSION_COOKIE_NAME]["httponly"] = True
    cookie[SESSION_COOKIE_NAME]["samesite"] = "Lax"
    return cookie.output(header="").strip()


def get_expired_session_cookie_header():
    cookie = SimpleCookie()
    cookie[SESSION_COOKIE_NAME] = ""
    cookie[SESSION_COOKIE_NAME]["path"] = "/"
    cookie[SESSION_COOKIE_NAME]["httponly"] = True
    cookie[SESSION_COOKIE_NAME]["samesite"] = "Lax"
    cookie[SESSION_COOKIE_NAME]["expires"] = "Thu, 01 Jan 1970 00:00:00 GMT"
    return cookie.output(header="").strip()


def create_user(email, password):
    normalized_email = validate_email(email)
    validate_password(password)
    password_hash = build_password_hash(password)

    with db_connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id FROM app_users WHERE email = %s",
                (normalized_email,),
            )
            existing = cur.fetchone()
            if existing:
                raise APIError(HTTPStatus.CONFLICT, "Пользователь с таким email уже существует.")

            cur.execute(
                """
                INSERT INTO app_users (email, password_hash)
                VALUES (%s, %s)
                RETURNING id, email, created_at
                """,
                (normalized_email, password_hash),
            )
            user = cur.fetchone()

    return user


def create_session_for_user(user_id):
    token = create_session_token()
    expires_at = utc_now() + timedelta(days=SESSION_TTL_DAYS)

    with db_connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO app_sessions (token, user_id, expires_at)
                VALUES (%s, %s, %s)
                """,
                (token, user_id, expires_at),
            )

    return token


def authenticate_user(email, password):
    normalized_email = validate_email(email)

    with db_connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, email, password_hash, created_at
                FROM app_users
                WHERE email = %s
                """,
                (normalized_email,),
            )
            user = cur.fetchone()

    if not user or not verify_password(password, user["password_hash"]):
        raise APIError(HTTPStatus.UNAUTHORIZED, "Неверный email или пароль.")

    return user


def get_user_by_session(token):
    if not token:
        return None

    with db_connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT u.id, u.email, u.created_at
                FROM app_sessions s
                JOIN app_users u ON u.id = s.user_id
                WHERE s.token = %s AND s.expires_at > NOW()
                """,
                (token,),
            )
            return cur.fetchone()


def delete_session(token):
    if not token:
        return

    with db_connect() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM app_sessions WHERE token = %s", (token,))


def create_chat_row(cur, user_id):
    chat_id = f"chat_{uuid.uuid4().hex[:12]}"
    cur.execute(
        """
        INSERT INTO app_chats (id, user_id, title)
        VALUES (%s, %s, %s)
        RETURNING id, user_id, title, created_at, updated_at
        """,
        (chat_id, user_id, "Новый чат"),
    )
    return cur.fetchone()


def get_chat_row(cur, user_id, chat_id):
    cur.execute(
        """
        SELECT id, user_id, title, created_at, updated_at
        FROM app_chats
        WHERE id = %s AND user_id = %s
        """,
        (chat_id, user_id),
    )
    chat = cur.fetchone()
    if not chat:
        raise APIError(HTTPStatus.NOT_FOUND, "Чат не найден.")
    return chat


def get_chat_messages(cur, chat_id):
    cur.execute(
        """
        SELECT id, role, content, meta, created_at
        FROM app_messages
        WHERE chat_id = %s
        ORDER BY created_at ASC
        """,
        (chat_id,),
    )
    return cur.fetchall()


def history_for_ai(messages):
    history = []
    for message in messages:
        if message["role"] in {"user", "assistant"}:
            history.append(
                {
                    "role": message["role"],
                    "content": message["content"],
                }
            )
    return history


def list_chats_payload(user_id):
    with db_connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    c.id,
                    c.title,
                    c.created_at,
                    c.updated_at,
                    COUNT(m.id)::int AS messages_count,
                    COALESCE(
                        (ARRAY_AGG(m.content ORDER BY m.created_at DESC))[1],
                        ''
                    ) AS preview
                FROM app_chats c
                LEFT JOIN app_messages m ON m.chat_id = c.id
                WHERE c.user_id = %s
                GROUP BY c.id, c.title, c.created_at, c.updated_at
                ORDER BY c.updated_at DESC
                """,
                (user_id,),
            )
            chats = cur.fetchall()

    return {"chats": [serialize_chat_summary(chat) for chat in chats]}


def get_chat_payload(user_id, chat_id):
    with db_connect() as conn:
        with conn.cursor() as cur:
            chat = get_chat_row(cur, user_id, chat_id)
            messages = get_chat_messages(cur, chat_id)

    return {"chat": serialize_chat(chat, messages)}


def create_chat_payload(user_id):
    with db_connect() as conn:
        with conn.cursor() as cur:
            chat = create_chat_row(cur, user_id)

    return {
        "chat": serialize_chat(chat, []),
        "chats": list_chats_payload(user_id)["chats"],
    }


def rename_chat_payload(user_id, chat_id, title):
    clean_title = " ".join(title.split())
    if not clean_title:
        raise APIError(HTTPStatus.BAD_REQUEST, "Название чата не может быть пустым.")
    if len(clean_title) > 80:
        clean_title = clean_title[:80]

    with db_connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE app_chats
                SET title = %s, updated_at = NOW()
                WHERE id = %s AND user_id = %s
                RETURNING id, user_id, title, created_at, updated_at
                """,
                (clean_title, chat_id, user_id),
            )
            chat = cur.fetchone()
            if not chat:
                raise APIError(HTTPStatus.NOT_FOUND, "Чат не найден.")
            messages = get_chat_messages(cur, chat_id)

    return {
        "chat": serialize_chat(chat, messages),
        "chats": list_chats_payload(user_id)["chats"],
    }


def delete_chat_payload(user_id, chat_id):
    with db_connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM app_chats WHERE id = %s AND user_id = %s RETURNING id",
                (chat_id, user_id),
            )
            deleted = cur.fetchone()
            if not deleted:
                raise APIError(HTTPStatus.NOT_FOUND, "Чат не найден.")

    return {
        "deleted_chat_id": chat_id,
        "chats": list_chats_payload(user_id)["chats"],
    }


def consult_payload(user_id, problem, chat_id=None):
    clean_problem = problem.strip()
    if not clean_problem:
        raise APIError(HTTPStatus.BAD_REQUEST, "Сначала опиши проблему.")

    with DB_LOCK:
        with db_connect() as conn:
            with conn.cursor() as cur:
                if chat_id:
                    chat = get_chat_row(cur, user_id, chat_id)
                else:
                    chat = create_chat_row(cur, user_id)

                messages = get_chat_messages(cur, chat["id"])
                history = history_for_ai(messages)
                history.append({"role": "user", "content": clean_problem})

                if chat["title"] == "Новый чат":
                    cur.execute(
                        """
                        UPDATE app_chats
                        SET title = %s
                        WHERE id = %s
                        RETURNING id, user_id, title, created_at, updated_at
                        """,
                        (build_chat_title(clean_problem), chat["id"]),
                    )
                    chat = cur.fetchone()

                user_message_id = f"msg_{uuid.uuid4().hex[:12]}"
                cur.execute(
                    """
                    INSERT INTO app_messages (id, chat_id, role, content, meta)
                    VALUES (%s, %s, %s, %s, %s::jsonb)
                    """,
                    (user_message_id, chat["id"], "user", clean_problem, json.dumps({})),
                )

                result = run_consultation(clean_problem, history=history)
                assistant_meta = {
                    "keywords": result.get("keywords", []),
                    "cases": result.get("cases", []),
                    "cases_found": result.get("cases_found", 0),
                }

                assistant_message_id = f"msg_{uuid.uuid4().hex[:12]}"
                cur.execute(
                    """
                    INSERT INTO app_messages (id, chat_id, role, content, meta)
                    VALUES (%s, %s, %s, %s, %s::jsonb)
                    """,
                    (
                        assistant_message_id,
                        chat["id"],
                        "assistant",
                        result.get("answer", ""),
                        json.dumps(assistant_meta, ensure_ascii=False),
                    ),
                )
                cur.execute(
                    """
                    UPDATE app_chats
                    SET updated_at = NOW()
                    WHERE id = %s
                    RETURNING id, user_id, title, created_at, updated_at
                    """,
                    (chat["id"],),
                )
                chat = cur.fetchone()
                messages = get_chat_messages(cur, chat["id"])

    return {
        "chat_id": chat["id"],
        "chat": serialize_chat(chat, messages),
        "keywords": result.get("keywords", []),
        "cases": result.get("cases", []),
        "cases_found": result.get("cases_found", 0),
        "answer": result.get("answer", ""),
        "chats": list_chats_payload(user_id)["chats"],
    }


class LegalAIHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB_DIR), **kwargs)

    def do_GET(self):
        parsed = urlparse(self.path)
        try:
            if parsed.path in {"/", "/index.html"}:
                self.path = "/index.html"
                return super().do_GET()

            if parsed.path == "/api/session":
                return self._handle_session()

            if parsed.path == "/api/auth/captcha":
                return self._handle_captcha()

            if parsed.path == "/api/chats":
                return self._handle_list_chats()

            if parsed.path.startswith("/api/chats/"):
                chat_id = parsed.path.removeprefix("/api/chats/").strip("/")
                return self._handle_get_chat(chat_id)

            self.path = parsed.path
            return super().do_GET()
        except APIError as error:
            self._send_json(error.status_code, {"error": error.message})

    def do_POST(self):
        parsed = urlparse(self.path)
        try:
            if parsed.path == "/api/auth/register":
                return self._handle_register()

            if parsed.path == "/api/auth/login":
                return self._handle_login()

            if parsed.path == "/api/auth/logout":
                return self._handle_logout()

            if parsed.path == "/api/chats":
                return self._handle_create_chat()

            if parsed.path == "/api/consult":
                return self._handle_consult()

            self.send_error(HTTPStatus.NOT_FOUND, "Маршрут не найден")
        except APIError as error:
            self._send_json(error.status_code, {"error": error.message})

    def do_PATCH(self):
        parsed = urlparse(self.path)
        try:
            if parsed.path.startswith("/api/chats/"):
                chat_id = parsed.path.removeprefix("/api/chats/").strip("/")
                return self._handle_rename_chat(chat_id)

            self.send_error(HTTPStatus.NOT_FOUND, "Маршрут не найден")
        except APIError as error:
            self._send_json(error.status_code, {"error": error.message})

    def do_DELETE(self):
        parsed = urlparse(self.path)
        try:
            if parsed.path.startswith("/api/chats/"):
                chat_id = parsed.path.removeprefix("/api/chats/").strip("/")
                return self._handle_delete_chat(chat_id)

            self.send_error(HTTPStatus.NOT_FOUND, "Маршрут не найден")
        except APIError as error:
            self._send_json(error.status_code, {"error": error.message})

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def guess_type(self, path):
        if path.endswith(".js"):
            return "application/javascript; charset=utf-8"
        if path.endswith(".css"):
            return "text/css; charset=utf-8"
        return mimetypes.guess_type(path)[0] or "application/octet-stream"

    def _read_json_body(self):
        content_length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(content_length)
        if not raw_body:
            return {}

        try:
            return json.loads(raw_body.decode("utf-8"))
        except json.JSONDecodeError as error:
            raise APIError(HTTPStatus.BAD_REQUEST, "Не удалось разобрать JSON-запрос.") from error

    def _parse_cookies(self):
        cookies = SimpleCookie()
        raw_cookie = self.headers.get("Cookie")
        if raw_cookie:
            cookies.load(raw_cookie)
        return cookies

    def _session_token(self):
        cookies = self._parse_cookies()
        session = cookies.get(SESSION_COOKIE_NAME)
        return session.value if session else ""

    def _require_user(self):
        user = get_user_by_session(self._session_token())
        if not user:
            raise APIError(HTTPStatus.UNAUTHORIZED, "Нужна авторизация.")
        return user

    def _handle_session(self):
        user = get_user_by_session(self._session_token())
        if not user:
            return self._send_json(HTTPStatus.OK, {"authenticated": False})

        self._send_json(
            HTTPStatus.OK,
            {
                "authenticated": True,
                "user": serialize_user(user),
            },
        )

    def _handle_captcha(self):
        self._send_json(HTTPStatus.OK, issue_captcha())

    def _handle_register(self):
        payload = self._read_json_body()
        email = payload.get("email", "")
        password = payload.get("password", "")
        password_repeat = payload.get("password_repeat", "")
        captcha_id = payload.get("captcha_id", "")
        captcha_answer = payload.get("captcha_answer", "")

        validate_password(password, password_repeat)
        verify_captcha(captcha_id, captcha_answer)
        user = create_user(email, password)
        token = create_session_for_user(user["id"])

        self._send_json(
            HTTPStatus.CREATED,
            {
                "authenticated": True,
                "user": serialize_user(user),
            },
            cookies=[get_session_cookie_header(token)],
        )

    def _handle_login(self):
        payload = self._read_json_body()
        email = payload.get("email", "")
        password = payload.get("password", "")
        user = authenticate_user(email, password)
        token = create_session_for_user(user["id"])

        self._send_json(
            HTTPStatus.OK,
            {
                "authenticated": True,
                "user": serialize_user(user),
            },
            cookies=[get_session_cookie_header(token)],
        )

    def _handle_logout(self):
        token = self._session_token()
        delete_session(token)
        self._send_json(
            HTTPStatus.OK,
            {"ok": True},
            cookies=[get_expired_session_cookie_header()],
        )

    def _handle_list_chats(self):
        user = self._require_user()
        self._send_json(HTTPStatus.OK, list_chats_payload(user["id"]))

    def _handle_get_chat(self, chat_id):
        user = self._require_user()
        self._send_json(HTTPStatus.OK, get_chat_payload(user["id"], chat_id))

    def _handle_create_chat(self):
        user = self._require_user()
        self._send_json(HTTPStatus.CREATED, create_chat_payload(user["id"]))

    def _handle_rename_chat(self, chat_id):
        user = self._require_user()
        payload = self._read_json_body()
        self._send_json(
            HTTPStatus.OK,
            rename_chat_payload(user["id"], chat_id, payload.get("title", "")),
        )

    def _handle_delete_chat(self, chat_id):
        user = self._require_user()
        self._send_json(HTTPStatus.OK, delete_chat_payload(user["id"], chat_id))

    def _handle_consult(self):
        user = self._require_user()
        payload = self._read_json_body()
        self._send_json(
            HTTPStatus.OK,
            consult_payload(
                user["id"],
                problem=payload.get("problem", ""),
                chat_id=payload.get("chat_id"),
            ),
        )

    def _send_json(self, status_code, payload, cookies=None):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        for cookie in cookies or []:
            self.send_header("Set-Cookie", cookie)
        self.end_headers()
        self.wfile.write(body)


def run(host="127.0.0.1", port=8000):
    initialize_database()
    server = ThreadingHTTPServer((host, port), LegalAIHandler)
    print(f"Сайт запущен: http://{host}:{port}")
    server.serve_forever()


if __name__ == "__main__":
    run()
