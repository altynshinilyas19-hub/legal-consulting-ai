import psycopg

DB_DSN = "dbname=legal_consulting user=postgres password=1231 host=localhost port=5432"

def search_cases(query_text: str, limit: int = 10):
    sql = """
    SELECT
        id,
        file_name,
        LEFT(content, 500) AS preview
    FROM cases
    WHERE content ILIKE %s
    LIMIT %s;
    """

    with psycopg.connect(DB_DSN) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (f"%{query_text}%", limit))
            return cur.fetchall()

def main():
    print("Простой поиск по делам")
    print("Чтобы выйти, напиши: exit\n")

    while True:
        query_text = input("Что искать: ").strip()

        if not query_text:
            print("Пустой запрос\n")
            continue

        if query_text.lower() == "exit":
            print("Выход.")
            break

        try:
            results = search_cases(query_text)

            if not results:
                print("Ничего не найдено\n")
                continue

            print(f"\nНайдено: {len(results)}\n")

            for row in results:
                case_id, file_name, preview = row

                print("=" * 80)
                print(f"ID: {case_id}")
                print(f"Файл: {file_name}")
                print("Фрагмент:")
                print(preview.replace("\n", " "))
                print()

        except Exception as e:
            print(f"Ошибка: {e}\n")

if __name__ == "__main__":
    main()