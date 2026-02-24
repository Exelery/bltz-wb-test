# btlz-wb-test — WB Tariffs & Google Sheets Export

The service does two things:

1. **Hourly:** Fetches the WB “Box tariffs” API and saves data to PostgreSQL (per-day accumulation; repeated requests for the same day update existing data).
2. **Every 6 hours:** Updates the `stocks_coefs` sheet in configured Google spreadsheets with the latest tariffs from the DB (sorted by coefficient ascending).

## Requirements

- Docker and Docker Compose
- (Optional) WB API token and Google service account — for tariff fetching and Sheets export

## Запуск одной командой

Приложение запускается **одной командой**, без копирования `.env` и прочих шагов:

```bash
docker compose up --build
```

(При следующих запусках достаточно `docker compose up`.)

Если файла `.env` нет, в `compose.yaml` используются значения по умолчанию: пользователь, пароль и база — **postgres**, порт 5432. Контейнеры `postgres` и `app` стартуют; при старте приложение выполняет миграции и сиды.

Без токенов WB и Google приложение тоже запускается; загрузка тарифов и выгрузка в таблицы отключены до указания `WB_API_TOKEN` и `GOOGLE_SERVICE_ACCOUNT_JSON` (по желанию).

## Configuration

Copy the example env and edit if needed:

```bash
cp .env.example .env
```

Variables in `.env` (or container environment):

| Variable | Description | Default (in compose) |
|----------|-------------|----------------------|
| `POSTGRES_PORT` | PostgreSQL port | 5432 |
| `POSTGRES_DB` | Database name | postgres |
| `POSTGRES_USER` | DB user | postgres |
| `POSTGRES_PASSWORD` | DB password | postgres |
| `APP_PORT` | App port | 3000 |
| `WB_API_TOKEN` | WB API token (from dev.wildberries.ru) | — |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Google service account JSON (string) | — |

No secrets are stored in the repo; `.env.example` only lists variable names and DB defaults.

## Data layout

- **API:** `GET https://common-api.wildberries.ru/api/v1/tariffs/box?date=YYYY-MM-DD`, header `Authorization: <WB_API_TOKEN>`.
- **DB:** Table `box_tariffs` — one row per (date, warehouse); columns match the API (warehouse, region, coefficients, etc.).
- **Google Sheets:** Spreadsheet IDs are stored in the `spreadsheets` table (column `spreadsheet_id`). For each ID the app updates the `stocks_coefs` sheet; data is the latest date from `box_tariffs`, sorted by coefficient (e.g. `box_storage_coef_expr`) ascending.

## Adding Google spreadsheets

Spreadsheet IDs are configured in the `spreadsheets` table:

- **Via seed:** Edit `src/postgres/seeds/spreadsheets.js`, add the desired `spreadsheet_id` values, then restart the container or run seeds manually.
- **Or** insert rows into `spreadsheets` after the first run.

The Google service account must have edit access to those spreadsheets (share the sheet with the service account email).

## How to test

**Run:** `docker compose up --build`. In the `app` container logs you should see: `Migrations and seeds done`, `Scheduler started (...)`.

**Without tokens:** The app starts; hourly you’ll see `WB_API_TOKEN not set, skipping tariffs fetch`, and every 6h `GOOGLE_SERVICE_ACCOUNT_JSON not set, skipping sheets sync`. That’s expected.

**Check DB:** Tables are created on first run:

```bash
docker compose exec postgres psql -U postgres -d postgres -c "\dt"
```

You should see `box_tariffs`, `spreadsheets`, `migrations`. After at least one successful tariff fetch (see below):

```bash
docker compose exec postgres psql -U postgres -d postgres -c "SELECT tariff_date, COUNT(*) FROM box_tariffs GROUP BY tariff_date;"
```

**WB tariff fetch:** Add `WB_API_TOKEN=...` to `.env`, restart with `docker compose up --build`. Within the first minute the first fetch runs; logs should show something like `Box tariffs saved for 2025-02-23: N rows`. Then run the DB query above.

**Google export:** Create a service account in Google Cloud and download the JSON key. Set `GOOGLE_SERVICE_ACCOUNT_JSON` in `.env` (entire JSON as a single string). Add a spreadsheet ID to the DB:

```bash
docker compose exec postgres psql -U postgres -d postgres -c "INSERT INTO spreadsheets (spreadsheet_id) VALUES ('YOUR_SPREADSHEET_ID') ON CONFLICT DO NOTHING;"
```

Grant the spreadsheet edit access to the service account email. On startup and every 6h the app syncs; the `stocks_coefs` sheet should appear or update with tariffs sorted by coefficient.

## Local development

- Start DB: `docker compose up -d postgres`
- **Create a migration** (generates a timestamped file; then fill in `up`/`down`):

  ```bash
  npm run knex:dev migrate make <migration_name>
  ```

- Apply migrations: `npm run knex:dev migrate latest`
- Seeds: `npm run knex:dev seed run`
- Run app: `npm run dev` (requires Node.js and dependencies)

## Repo contents

- Application code: `src/` (config, migrations, seeds, WB and Google Sheets services, scheduler).
- Docker: `compose.yaml`, `Dockerfile`.
- Config template (no secrets): `.env.example` — заготовка без чувствительных данных; для БД по умолчанию user/password/database = postgres.

Соответствие ТЗ: репозиторий содержит код приложения, compose-файл и readme с инструкцией; приложение поднимается одной командой `docker compose up --build` без дополнительных действий; к БД — knex; в конфигурации по умолчанию пользователь, пароль и БД — postgres.
