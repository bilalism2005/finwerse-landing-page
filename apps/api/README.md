# Finwerse API

FastAPI service that fetches market/fundamental data, computes stock scores, and serves them to the web/mobile clients.

## Stack
- **FastAPI** + **Uvicorn**
- **SQLAlchemy** (ORM) → **Postgres** (`DATABASE_URL`)
- **APScheduler** — daily batch job at 10:15 UTC (3:45 PM IST)
- **pandas** / **pandas-ta** — indicator math
- **httpx** + **pyotp** (TOTP) — external data sources (EODHD, IndianAPI, Angel One)

## Setup

Requires **Python 3.12.2** (see `.python-version`).

```bash
cd apps/api
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

### Environment

Copy and fill in `apps/api/.env`:
```bash
cp .env.example .env
```

Required variables:
```bash
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# External market-data providers (all required for a full batch run)
INDIANAPI_KEY=...
EODHD_API_KEY=...
ANGEL_ONE_CLIENT_ID=...
ANGEL_ONE_PIN=...
ANGEL_ONE_TOTP_SECRET=...
ANGEL_ONE_API_KEY=...
```

> On Render these are set as `sync: false` env vars in the dashboard, so they must be added manually. Locally they live in `.env` (git-ignored).

### Database + first run

```bash
python init_db.py        # create tables from models.py
python seed_and_run.py   # seed data and run one full batch so scores exist
```

`BatchProcessor` (in `services/batch_processor.py`) reads from `data_fetcher.py`, scores via `scoring.py`, and writes rows to the `StockScore` table.

## Run

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

- Health: `GET /` → `{"status":"healthy"}`
- Stocks:
  - `GET /stocks/top?score_type=overall&timeframe=short&limit=10`
  - `GET /stocks/search?q=INFY&timeframe=short`
  - `GET /stocks/{symbol}/score?timeframe=medium`

`score_type` ∈ `overall|technical|safety|sentiment`; `timeframe` ∈ `short|medium|long`.

## Notes
- The app's `startup_event` starts the background scheduler. In production use the cron trigger; locally the batch only runs once at 10:15 UTC unless you call `seed_and_run.py`.
- `scratch/` and the `test_*.py` / `verify_*.py` scripts are developer probes — safe to ignore for normal operation.
