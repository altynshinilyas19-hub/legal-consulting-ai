from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path

import psycopg
from psycopg.types.json import Json


ROOT_DIR = Path(__file__).resolve().parent
TXT_DIR = ROOT_DIR / "sudact_output" / "cases_txt"
DB_DSN = "dbname=legal_consulting user=postgres password=1231 host=localhost port=5432"

HEADER_FIELDS = ("TITLE", "URL", "SECTION", "LIST_PAGE", "DATE", "COURT", "CASE_NUMBER")
CASE_URL_MARKER = "/doc/"


def normalize(text: str | None) -> str:
    return re.sub(r"\s+", " ", (text or "")).strip()


def parse_headers_and_body(raw_text: str) -> tuple[dict[str, str], str]:
    lines = raw_text.splitlines()
    headers: dict[str, str] = {}
    body_start = 0
    last_header_index = -1

    for index, line in enumerate(lines[:40]):
        stripped = line.strip()
        if not stripped:
            if headers:
                body_start = index + 1
                break
            continue
        if ":" not in line:
            continue

        key, value = line.split(":", 1)
        key = key.strip().upper()
        if key in HEADER_FIELDS:
            headers[key] = value.strip()
            last_header_index = index

    if body_start == 0 and last_header_index >= 0:
        body_start = last_header_index + 1

    body = "\n".join(lines[body_start:]).strip()
    return headers, body


def parse_date(value: str | None):
    if not value:
        return None
    value = normalize(value)
    try:
        return datetime.strptime(value, "%d.%m.%Y").date()
    except ValueError:
        return None


def extract_case_number(title: str, body: str) -> str | None:
    for source in (title, body[:5000]):
        match = re.search(r"(?:Дело|дело)\s*№?\s*([A-Za-zА-Яа-я0-9/\-]+)", source)
        if match:
            return normalize(match.group(1))
    return None


def infer_category(section_url: str, source_url: str, title: str) -> str | None:
    haystack = " ".join((section_url, source_url, title)).lower()
    if "/arbitral/" in haystack:
        return "Арбитраж"
    if "/regular/" in haystack:
        return "Суды общей юрисдикции"
    if "/practice/" in haystack:
        return "Судебная практика"
    return None


def extract_court_name(header_value: str | None, body: str) -> str | None:
    header_value = normalize(header_value)
    if header_value and len(header_value) <= 255 and "СудАкт" not in header_value and "::" not in header_value:
        return header_value

    snippet = normalize(body[:4000])
    patterns = (
        r"((?:Арбитражный|Верховный|Конституционный)[^.]{5,120}?суд[^.]{0,80}?)(?=\s+-\s+|\s+\d{5,6},|\s+РЕШЕНИЕ|\s+ОПРЕДЕЛЕНИЕ|\s+ПОСТАНОВЛЕНИЕ)",
        r"((?:[А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+){0,6}\s+суд[^.]{0,80}?))(?=\s+-\s+|\s+\d{5,6},|\s+РЕШЕНИЕ|\s+ОПРЕДЕЛЕНИЕ|\s+ПОСТАНОВЛЕНИЕ)",
    )
    for pattern in patterns:
        match = re.search(pattern, snippet, re.IGNORECASE)
        if match:
            return normalize(match.group(1))
    return None


def clean_body(body: str) -> str:
    cleaned = body.replace("\ufeff", "").strip()

    start_markers = (
        "АРБИТРАЖНЫЙ СУД",
        "Арбитражный суд",
        "ВЕРХОВНЫЙ СУД",
        "Верховный Суд",
        "КОНСТИТУЦИОННЫЙ СУД",
        "Конституционный Суд",
        "РЕШЕНИЕ",
        "ОПРЕДЕЛЕНИЕ",
        "ПОСТАНОВЛЕНИЕ",
        "ПРИГОВОР",
        "Именем Российской Федерации",
    )
    start_positions = [cleaned.find(marker) for marker in start_markers if cleaned.find(marker) > 80]
    if start_positions:
        cleaned = cleaned[min(start_positions):].strip()

    footer_markers = (
        "Печать документа",
        "Отправить на e-mail",
        "Сохранить в Word",
        "Получить ссылку на документ",
        "Прямая ссылка на документ",
        "Все права защищены",
    )
    end_positions = [cleaned.find(marker) for marker in footer_markers if cleaned.find(marker) > 0]
    if end_positions:
        cleaned = cleaned[: min(end_positions)].strip()

    return cleaned


def build_excerpt(body: str, limit: int = 320) -> str | None:
    cleaned = normalize(body)
    if not cleaned:
        return None
    return cleaned[:limit]


def parse_case_file(path: Path) -> dict | None:
    raw_text = path.read_text(encoding="utf-8", errors="ignore")
    headers, body = parse_headers_and_body(raw_text)

    if not body:
        return None

    title = normalize(headers.get("TITLE")) or path.stem.split("_", 1)[-1].replace("_", " ")
    source_url = normalize(headers.get("URL")) or None

    if not source_url or CASE_URL_MARKER not in source_url:
        return None

    section_url = normalize(headers.get("SECTION"))
    cleaned_body = clean_body(body) or body
    decision_date = parse_date(headers.get("DATE"))
    court_name = extract_court_name(headers.get("COURT"), cleaned_body)
    case_number = normalize(headers.get("CASE_NUMBER")) or extract_case_number(title, cleaned_body)
    category = infer_category(section_url, source_url, title)

    return {
        "file_name": path.name,
        "title": title or None,
        "case_number": case_number or None,
        "court_name": court_name,
        "category": category,
        "region": None,
        "source_url": source_url,
        "decision_date": decision_date,
        "excerpt": build_excerpt(cleaned_body),
        "content": cleaned_body,
        "case_metadata": {
            "section_url": section_url or None,
            "list_page": normalize(headers.get("LIST_PAGE")) or None,
            "import_source": "sudact_output/cases_txt",
            "original_path": str(path),
        },
    }


def ensure_cases_schema(cur) -> None:
    cur.execute(
        """
        ALTER TABLE cases
            ADD COLUMN IF NOT EXISTS title VARCHAR(500),
            ADD COLUMN IF NOT EXISTS case_number VARCHAR(255),
            ADD COLUMN IF NOT EXISTS court_name VARCHAR(255),
            ADD COLUMN IF NOT EXISTS category VARCHAR(255),
            ADD COLUMN IF NOT EXISTS region VARCHAR(255),
            ADD COLUMN IF NOT EXISTS source_url VARCHAR(500),
            ADD COLUMN IF NOT EXISTS decision_date DATE,
            ADD COLUMN IF NOT EXISTS excerpt TEXT,
            ADD COLUMN IF NOT EXISTS case_metadata JSON NOT NULL DEFAULT '{}'::json,
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        """
    )
    cur.execute("CREATE INDEX IF NOT EXISTS ix_cases_case_number ON cases (case_number)")
    cur.execute("CREATE INDEX IF NOT EXISTS ix_cases_court_name ON cases (court_name)")
    cur.execute("CREATE INDEX IF NOT EXISTS ix_cases_category ON cases (category)")
    cur.execute("CREATE INDEX IF NOT EXISTS ix_cases_source_url ON cases (source_url)")
    cur.execute(
        """
        UPDATE cases
        SET
            title = COALESCE(title, file_name),
            excerpt = COALESCE(excerpt, LEFT(content, 320)),
            case_metadata = COALESCE(case_metadata, '{}'::json),
            updated_at = COALESCE(updated_at, now()),
            created_at = COALESCE(created_at, now())
        """
    )


def load_existing_keys(cur) -> tuple[dict[str, int], dict[str, int]]:
    cur.execute("SELECT id, file_name, COALESCE(source_url, '') FROM cases")
    existing_files: dict[str, int] = {}
    existing_urls: dict[str, int] = {}

    for case_id, file_name, source_url in cur.fetchall():
        if file_name and file_name not in existing_files:
            existing_files[file_name] = case_id
        if source_url and source_url not in existing_urls:
            existing_urls[source_url] = case_id

    return existing_files, existing_urls


def import_cases() -> None:
    if not TXT_DIR.exists():
        raise FileNotFoundError(f"Не найдена папка с делами: {TXT_DIR}")

    all_files = sorted(TXT_DIR.rglob("*.txt"))
    print(f"Найдено файлов: {len(all_files)}")

    inserted = 0
    updated = 0
    skipped_non_case = 0

    with psycopg.connect(DB_DSN) as conn:
        with conn.cursor() as cur:
            ensure_cases_schema(cur)
            conn.commit()

            existing_files, existing_urls = load_existing_keys(cur)

            for index, path in enumerate(all_files, start=1):
                row = parse_case_file(path)
                if not row:
                    skipped_non_case += 1
                    continue

                existing_id = existing_files.get(row["file_name"])
                if not existing_id and row["source_url"]:
                    existing_id = existing_urls.get(row["source_url"])

                payload = {
                    **row,
                    "case_metadata": Json(row["case_metadata"]),
                }

                if existing_id:
                    cur.execute(
                        """
                        UPDATE cases
                        SET
                            file_name = %(file_name)s,
                            title = %(title)s,
                            case_number = %(case_number)s,
                            court_name = %(court_name)s,
                            category = %(category)s,
                            region = %(region)s,
                            source_url = %(source_url)s,
                            decision_date = %(decision_date)s,
                            excerpt = %(excerpt)s,
                            content = %(content)s,
                            case_metadata = %(case_metadata)s::json,
                            updated_at = now()
                        WHERE id = %(case_id)s
                        """,
                        {
                            **payload,
                            "case_id": existing_id,
                        },
                    )
                    updated += 1
                else:
                    cur.execute(
                        """
                        INSERT INTO cases (
                            file_name,
                            title,
                            case_number,
                            court_name,
                            category,
                            region,
                            source_url,
                            decision_date,
                            excerpt,
                            content,
                            case_metadata
                        )
                        VALUES (%(file_name)s, %(title)s, %(case_number)s, %(court_name)s, %(category)s,
                                %(region)s, %(source_url)s, %(decision_date)s, %(excerpt)s, %(content)s,
                                %(case_metadata)s::json)
                        RETURNING id
                        """,
                        payload,
                    )
                    existing_id = cur.fetchone()[0]
                    inserted += 1

                existing_files[row["file_name"]] = existing_id
                existing_urls[row["source_url"]] = existing_id

                if (inserted + updated) % 200 == 0:
                    conn.commit()
                    print(
                        f"[OK] Обновлено: {updated} | добавлено: {inserted} | "
                        f"просмотрено файлов: {index}/{len(all_files)}"
                    )

            conn.commit()

        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM cases")
            total_cases = cur.fetchone()[0]

    print("")
    print(f"Добавлено новых дел: {inserted}")
    print(f"Обновлено существующих дел: {updated}")
    print(f"Пропущено не-документов: {skipped_non_case}")
    print(f"Всего записей в cases: {total_cases}")


if __name__ == "__main__":
    import_cases()
