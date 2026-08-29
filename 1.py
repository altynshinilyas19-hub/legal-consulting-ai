import json
import re
import time
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://sudact.ru"
MAX_LIST_PAGES = 100
SLEEP_BETWEEN_REQUESTS = 1.0
REQUEST_TIMEOUT = 30

START_SECTIONS = [
    "https://sudact.ru/practice/mery-presecheniya/",
    "https://sudact.ru/practice/dokazatelstva/",
    "https://sudact.ru/practice/prigovor-neispolnenie-prigovora/",
    "https://sudact.ru/practice/narushenie-pravil-dorozhnogo-dvizheniya/",
    "https://sudact.ru/practice/prestuplenie-protiv-svobody-lichnosti-nezakonnoe-l/",
    "https://sudact.ru/practice/umyshlennoe-prichinenie-tyazhkogo-vreda-zdorovyu/",
    "https://sudact.ru/practice/prestupnoe-soobshestvo/",
    "https://sudact.ru/practice/souchastie-predvaritelnyj-sgovor/",
    "https://sudact.ru/practice/poddelka-dokumentov-gosudarstvennyh-nagrad-pechate/",
    "https://sudact.ru/practice/po-vymogatelstvu/",
    "https://sudact.ru/practice/po-podzhogam/",
    "https://sudact.ru/practice/nezakonnoe-predprinimatelstvo/",
    "https://sudact.ru/practice/kontrabanda/",
    "https://sudact.ru/practice/pohishenie/",
    "https://sudact.ru/practice/po-narkotikam/",
    "https://sudact.ru/practice/prevyshenie-dolzhnostnyh-polnomochij/",
    "https://sudact.ru/practice/po-ohrane-truda/",
    "https://sudact.ru/practice/halatnost/",
    "https://sudact.ru/practice/po-korrupcionnym-prestupleniyam-po-vzyatochnichest/",
    "https://sudact.ru/practice/po-grabezham/",
    "https://sudact.ru/practice/amnistiya/",
    "https://sudact.ru/practice/po-delam-o-huliganstve/",
    "https://sudact.ru/practice/ugolovnaya-otvetstvennost-nesovershennoletnih/",
    "https://sudact.ru/practice/kommercheskij-podkup/",
    "https://sudact.ru/practice/razboj/",
    "https://sudact.ru/practice/po-krazham/",
    "https://sudact.ru/practice/po-delam-ob-iznasilovanii/",
    "https://sudact.ru/practice/prisvoenie-i-rastrata/",
    "https://sudact.ru/practice/po-moshennichestvu/",
    "https://sudact.ru/practice/poboi/",
    "https://sudact.ru/practice/zloupotreblenie-dolzhnostnymi-polnomochiyami/",
    "https://sudact.ru/practice/po-delam-ob-ubijstve/",
    "https://sudact.ru/practice/samoupravstvo/",
    "https://sudact.ru/practice/kleveta/",
]

OUT_DIR = Path("sudact_output")
TXT_DIR = OUT_DIR / "cases_txt"
JSONL_FILE = OUT_DIR / "all_cases.jsonl"
SEEN_CASES_FILE = OUT_DIR / "seen_cases.txt"
BAD_URLS_FILE = OUT_DIR / "bad_urls.txt"

OUT_DIR.mkdir(exist_ok=True)
TXT_DIR.mkdir(exist_ok=True)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
}


def norm(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "")).strip()


def safe_filename(text: str, max_len: int = 140) -> str:
    text = norm(text)
    text = re.sub(r'[\\/*?:"<>|]', "_", text).strip(" .")
    return (text or "case")[:max_len]


def load_seen(path: Path) -> set:
    if not path.exists():
        return set()
    return {line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()}


def append_line(path: Path, value: str):
    with open(path, "a", encoding="utf-8") as f:
        f.write(value + "\n")


def append_jsonl(row: dict):
    with open(JSONL_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")


def save_txt(row: dict, idx: int):
    fname = f"{idx:07d}_{safe_filename(row.get('title') or 'case')}.txt"
    path = TXT_DIR / fname

    content = [
        f"TITLE: {row.get('title', '')}",
        f"URL: {row.get('url', '')}",
        f"SECTION: {row.get('section', '')}",
        f"LIST_PAGE: {row.get('list_page', '')}",
        f"DATE: {row.get('date', '')}",
        f"COURT: {row.get('court', '')}",
        f"CASE_NUMBER: {row.get('case_number', '')}",
        "",
        row.get("text_raw", "")
    ]

    path.write_text("\n".join(content), encoding="utf-8")
    return path


def get_soup(session: requests.Session, url: str) -> BeautifulSoup:
    resp = session.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
    resp.raise_for_status()
    return BeautifulSoup(resp.text, "lxml")


def build_list_page_urls(section_url: str, max_pages: int) -> list[str]:
    section_url = section_url.rstrip("/") + "/"
    urls = []

    for page_num in range(1, max_pages + 1):
        if page_num == 1:
            urls.append(section_url)
        else:
            # Основной вариант пагинации
            urls.append(f"{section_url}?page={page_num}")

    return urls


def extract_case_links(soup: BeautifulSoup, current_url: str) -> list[str]:
    links = []
    seen = set()

    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        full_url = urljoin(current_url, href)

        if not full_url.startswith(BASE_URL):
            continue

        # Отсекаем сами разделы и страницы пагинации
        if "/practice/" in full_url and full_url.rstrip("/") == current_url.rstrip("/"):
            continue

        if "?page=" in full_url or "&page=" in full_url:
            continue

        # Нужны только более глубокие ссылки
        path = full_url.replace(BASE_URL, "")
        depth = len([x for x in path.split("/") if x])

        if depth < 3:
            continue

        text = norm(a.get_text(" ", strip=True))
        if len(text) < 5:
            continue

        if full_url not in seen:
            seen.add(full_url)
            links.append(full_url)

    return links


def extract_case_data(case_url: str, soup: BeautifulSoup, list_page_url: str, section_url: str) -> dict | None:
    title = ""

    h1 = soup.find("h1")
    if h1:
        title = norm(h1.get_text(" ", strip=True))

    if not title and soup.title:
        title = norm(soup.title.get_text(" ", strip=True))

    body_text = norm(soup.get_text("\n", strip=True))

    if len(body_text) < 1500:
        return None

    case_number = ""
    m = re.search(r"(?:Дело|дело)\s*№?\s*([A-Za-zА-Яа-я0-9/\-]+)", body_text)
    if m:
        case_number = m.group(1)

    date = ""
    m = re.search(r"\b(\d{2}\.\d{2}\.\d{4})\b", body_text)
    if m:
        date = m.group(1)

    court = ""
    parts = re.split(r"[.!?]\s+", body_text[:4000])
    for chunk in parts:
        if "суд" in chunk.lower():
            court = norm(chunk)
            break

    return {
        "url": case_url,
        "section": section_url,
        "list_page": list_page_url,
        "title": title,
        "date": date,
        "court": court,
        "case_number": case_number,
        "text_raw": body_text,
    }


def scrape():
    session = requests.Session()
    seen_cases = load_seen(SEEN_CASES_FILE)
    saved_count = len(seen_cases)

    print(f"Категорий для обхода: {len(START_SECTIONS)}")

    for section in START_SECTIONS:
        print("\n" + "=" * 80)
        print(f"РАЗДЕЛ: {section}")
        print("=" * 80)

        list_page_urls = build_list_page_urls(section, MAX_LIST_PAGES)

        for i, list_page_url in enumerate(list_page_urls, start=1):
            print(f"\n===== LIST PAGE {i}/{len(list_page_urls)} =====")
            print(list_page_url)

            try:
                soup = get_soup(session, list_page_url)
            except Exception as e:
                print(f"Ошибка страницы списка: {e}")
                append_line(BAD_URLS_FILE, list_page_url)
                continue

            case_links = extract_case_links(soup, list_page_url)
            print(f"Найдено ссылок-кандидатов: {len(case_links)}")

            page_saved = 0

            for case_url in case_links:
                if case_url in seen_cases:
                    continue

                try:
                    case_soup = get_soup(session, case_url)
                    row = extract_case_data(case_url, case_soup, list_page_url, section)

                    if not row:
                        print(f"SKIP: {case_url}")
                        continue

                    saved_count += 1
                    page_saved += 1

                    append_jsonl(row)
                    save_txt(row, saved_count)
                    append_line(SEEN_CASES_FILE, case_url)
                    seen_cases.add(case_url)

                    print(f"SAVED #{saved_count}: {row['title'][:100]}")
                    time.sleep(SLEEP_BETWEEN_REQUESTS)

                except Exception as e:
                    print(f"CASE ERROR: {case_url} -> {e}")
                    append_line(BAD_URLS_FILE, case_url)

            print(f"Сохранено с этой страницы: {page_saved}")
            time.sleep(SLEEP_BETWEEN_REQUESTS)

    print("\nГОТОВО")
    print(f"Всего сохранено: {saved_count}")
    print(f"TXT: {TXT_DIR}")
    print(f"JSONL: {JSONL_FILE}")


if __name__ == "__main__":
    scrape()