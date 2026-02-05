# Made in Russia Catalog MVP

Pinterest-style каталог контента из Telegram-канала [`@madeinrussia`](https://t.me/madeinrussia).

## Что реализовано

- **Инжест Telegram** (последние 500 + инкрементально с `last_message_id`)
- Фильтрация постов по хэштегам: `#drop`, `#brand`, `#art`, `#home`, и варианты `@madeinrussia`
- Извлечение ссылок из текста, загрузка всех фото (включая альбомы), одно фото = один pin
- LLM-извлечение: `brand_name`, `tags[]`, `short_title`, `confidence`
- Порог confidence (`LLM_CONFIDENCE_THRESHOLD`): низкая уверенность не публикуется
- Дедуп брендов (нормализованное имя), связь `pins -> brands`
- Публичная витрина с masonry grid, фильтром по тегам, сортировкой по новым, поиском
- Детальная карточка со ссылками и источником на Telegram
- Админка: редактирование pin, смена статуса, merge брендов, скрытие брендов
- Cron GitHub Actions каждые 30 минут + ручной запуск

## Структура

```
/
  apps/
    web/
  ingest/
  supabase/
    migrations.sql
  .github/workflows/ingest.yml
```

## 1) Требования

- Node.js 20+
- Python 3.11+
- Supabase проект
- Telegram API credentials (api_id/api_hash/session)
- OpenAI API key

## 2) Настройка Supabase

1. Создайте проект в Supabase.
2. Выполните SQL из `supabase/migrations.sql` в SQL Editor.
3. Создайте публичный bucket в Storage с именем `pins`.
4. Получите:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

## 3) Настройка web (Next.js)

```bash
cd apps/web
cp .env.example .env.local
```

Заполните `.env.local`:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_ALLOWLIST_EMAILS=admin@example.com
```

Запуск:

```bash
npm install
npm run dev
```

Откройте:
- Витрина: `http://localhost:3000`
- Админка: `http://localhost:3000/admin`

## 4) Настройка ingest локально

```bash
cd ingest
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Создайте `.env` в `ingest/`:

```env
TELEGRAM_API_ID=
TELEGRAM_API_HASH=
TELEGRAM_SESSION=
TELEGRAM_CHANNEL=madeinrussia

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=pins

OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
LLM_CONFIDENCE_THRESHOLD=0.7
```

Запуск:

```bash
python ingest.py
```

## 5) GitHub Actions (scheduled ingest)

Добавьте в **GitHub Secrets**:

- `TELEGRAM_API_ID`
- `TELEGRAM_API_HASH`
- `TELEGRAM_SESSION`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `LLM_CONFIDENCE_THRESHOLD`

Workflow: `.github/workflows/ingest.yml`

- Schedule: каждые 30 минут
- Manual: вкладка Actions → **Telegram ingest** → **Run workflow**

## 6) Деплой на Vercel (опционально)

1. Подключите GitHub репозиторий в Vercel.
2. Root directory: `apps/web`
3. Добавьте env-переменные как в `.env.local`.
4. Deploy.

## 7) Принципы идемпотентности

- `telegram_posts` уникален по `(channel, message_id)`
- `pins` уникален по `(telegram_post_id, image_storage_path)`
- `ingest_state.last_message_id` обновляется после успешной обработки

## 8) Acceptance Criteria coverage

- Релевантные посты по хэштегам загружаются, фото превращаются в pins.
- На витрине только `status=published`, сортировка по `posted_at desc`.
- Фильтр по тегам + поиск по FTS работают.
- В детальной карточке есть ссылка на Telegram-источник.
- В админке можно редактировать pins и скрывать.
- Merge брендов переносит pins на целевой `brand_id`.
- Повторный ingest не создаёт дубликаты.
- Низкий confidence не публикуется автоматически.
