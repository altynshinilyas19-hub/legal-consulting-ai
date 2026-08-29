# Локальный запуск сайта

## 1. Установка зависимостей

```bash
py -m pip install -r requirements.txt
```

## 2. Проверка подключения к PostgreSQL

Приложение использует тот же `LEGAL_DB_DSN`, что и `ai.py`.

Если ничего не менять, будет использована строка подключения из `ai.py`:

```text
dbname=legal_consulting user=postgres password=1231 host=localhost port=5432
```

Если у тебя другие параметры PostgreSQL, перед запуском задай свою переменную окружения:

```powershell
$env:LEGAL_DB_DSN="dbname=legal_consulting user=postgres password=ТВОЙ_ПАРОЛЬ host=localhost port=5432"
```

## 3. Запуск сервера

```bash
py app.py
```

Или просто запусти `start_server.bat`.

После запуска сайт откроется по адресу:

```text
http://127.0.0.1:8000
```

## 4. Что создаётся автоматически

При первом запуске сервер сам создаст таблицы:

- `app_users`
- `app_sessions`
- `app_chats`
- `app_messages`

## 5. Необязательные переменные окружения

- `LEGAL_DB_DSN`
- `LEGAL_AI_API_KEY`
- `LEGAL_AI_BASE_URL`
- `LEGAL_AI_MODEL`
