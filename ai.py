import os

import httpx
import psycopg
from openai import OpenAI


DB_DSN = os.getenv(
    "LEGAL_DB_DSN",
    "dbname=legal_consulting user=postgres password=1231 host=localhost port=5432",
)

API_KEY = os.getenv(
    "LEGAL_AI_API_KEY",
    "sk-inv-2RTKUD3LeD85I9FX8B4RO7g2m_CLTJaT",
)

BASE_URL = os.getenv(
    "LEGAL_AI_BASE_URL",
    "https://codex.sale/v1",
)

MODEL = os.getenv(
    "LEGAL_AI_MODEL",
    "gpt-5.4",
)

client = None


def get_client():
    global client
    if client is None:
        # Pass an explicit httpx client to avoid the openai/httpx
        # compatibility issue that breaks consultation initialization.
        client = OpenAI(
            api_key=API_KEY,
            base_url=BASE_URL,
            http_client=httpx.Client(
                timeout=120,
                follow_redirects=True,
            ),
        )
    return client

chat_history = []


def extract_keywords(problem_text, history):
    history_text = ""

    for msg in history[-6:]:
        history_text += f"{msg['role']}: {msg['content']}\n"

    prompt = f"""
Ты юридическая поисковая система. Если пользователь задает спорный вопрос, рассуждай
ЕСЛИ ПОЛЬЗОВАТЕЛЬ ЗАДАЕТ ВОПРОС НЕ ПО ЮРИДИЧЕКСИМ ВОПРОСАМ ПИШИ НЕ КОРРЕКТНЫЙ ЗАПРОС
История:

{history_text}

Последнее сообщение:

{problem_text}

Выдели:
- юридические термины
- статьи
- тип спора
- ключевые сущности

Верни ТОЛЬКО список через запятую.

Пример:
мошенничество, земельный участок, 159 УК РФ, право собственности
"""

    response = get_client().chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": "Ты юридический поисковый движок.",
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        temperature=0,
        max_tokens=120,
    )

    text = (response.choices[0].message.content or "").strip()
    keywords = []

    for keyword in text.split(","):
        cleaned = keyword.strip()
        if len(cleaned) >= 3:
            keywords.append(cleaned)

    return keywords


def search_cases(keywords, limit=3):
    if not keywords:
        return []

    conditions = []
    params = []

    for word in keywords:
        conditions.append("content ILIKE %s")
        params.append(f"%{word}%")

    where_clause = " OR ".join(conditions)
    sql = f"""
    SELECT
        id,
        file_name,
        LEFT(content, 700)
    FROM cases
    WHERE {where_clause}
    LIMIT %s;
    """

    params.append(limit)

    with psycopg.connect(DB_DSN) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchall()


def get_case_by_id(case_id):
    sql = """
    SELECT
        id,
        file_name,
        content
    FROM cases
    WHERE id = %s
    """

    with psycopg.connect(DB_DSN) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (case_id,))
            return cur.fetchone()


def analyze_problem(problem_text, cases, history):
    cases_text = ""

    for index, (case_id, file_name, content) in enumerate(cases, start=1):
        cases_text += f"""
ДЕЛО {index}
ID: {case_id}
ФАЙЛ: {file_name}

{content}

====================================================
"""

    prompt = f"""
Проблема пользователя:

{problem_text}

Найдены похожие дела.

Ответь КРАТКО и ПО ДЕЛУ.

ФОРМАТ:

СУТЬ:
...

ПОХОЖИЕ ДЕЛА:
- ID ...
- ID ...

ЧТО РЕШИЛ СУД: (ТУТ БОЛЕЕ ПОДРОБНО РАСПИШИ КОГДА И В КАКОМ СУДЕ КАК РЕШИЛИ)
- ...

РИСКИ:
- ...

ВЫВОД: (ТУТ КАК СТОИТ ПОСТУПИТЬ ПОЛЬЗОВАТЕЛЮ ПИШЕШЬ)
- ...

Не пиши длинные тексты.
Не пиши как ChatGPT.
Не используй воду.

ДЕЛА:

{cases_text}
"""

    messages = [
        {
            "role": "system",
            "content": """
Ты ЮристКонсультант.

Ты:
- краткий
- конкретный
- без воды
- без эмоций

Ты не ChatGPT.
""",
        }
    ]

    messages.extend(history[-6:])
    messages.append({"role": "user", "content": prompt})

    response = get_client().chat.completions.create(
        model=MODEL,
        messages=messages,
        temperature=0,
        max_tokens=500,
    )

    return response.choices[0].message.content or ""


def run_consultation(problem_text, history=None):
    clean_problem = problem_text.strip()
    if not clean_problem:
        raise ValueError("Пустой запрос.")

    history = history or []
    keywords = extract_keywords(clean_problem, history)
    cases = search_cases(keywords)

    if not cases:
        return {
            "keywords": keywords,
            "cases": [],
            "cases_found": 0,
            "answer": "Похожие дела не найдены.",
        }

    answer = analyze_problem(clean_problem, cases, history)
    serialized_cases = []

    for case_id, file_name, content in cases:
        serialized_cases.append(
            {
                "id": case_id,
                "file_name": file_name,
                "snippet": content,
            }
        )

    return {
        "keywords": keywords,
        "cases": serialized_cases,
        "cases_found": len(serialized_cases),
        "answer": answer,
    }


def show_case(case_id):
    case_data = get_case_by_id(case_id)

    if not case_data:
        print("\nДело не найдено\n")
        return

    case_id, file_name, content = case_data

    print("\n" + "=" * 70)
    print(f"ID: {case_id}")
    print(f"ФАЙЛ: {file_name}")
    print("=" * 70)
    print(content[:15000])
    print("\n" + "=" * 70 + "\n")


def main():
    print("=" * 70)
    print("LEGAL AI")
    print("Команды:")
    print("exit -> выход")
    print("case ID -> открыть дело")
    print("=" * 70)
    print()

    while True:
        user_input = input("Вы: ").strip()

        if not user_input:
            continue

        if user_input.lower() == "exit":
            break

        if user_input.lower().startswith("case "):
            try:
                case_id = int(user_input.lower().replace("case ", ""))
                show_case(case_id)
            except Exception:
                print("\nНеверный ID дела\n")

            continue

        try:
            chat_history.append({"role": "user", "content": user_input})

            print("\nAI анализирует...\n")

            result = run_consultation(user_input, history=chat_history)
            chat_history.append({"role": "assistant", "content": result["answer"]})

            print("=" * 70)
            print("\nКЛЮЧЕВЫЕ СЛОВА:")
            print(", ".join(result["keywords"]))

            print("\nНАЙДЕННЫЕ ДЕЛА:")
            for case_item in result["cases"]:
                print(f"- ID {case_item['id']} | {case_item['file_name']}")

            print("\nОТВЕТ:\n")
            print(result["answer"])

            print("\nЧтобы открыть дело:")
            print("case ID")
            print("\n" + "=" * 70 + "\n")
        except Exception as error:
            print("\nERROR:")
            print(repr(error))
            print()


if __name__ == "__main__":
    main()
