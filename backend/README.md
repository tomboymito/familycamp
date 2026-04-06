# FamilyCamp backend (MVP)

## Run

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Environment

- `DATABASE_URL` — PostgreSQL URL (`postgresql+psycopg://...`) or SQLite for local MVP.
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` — basic auth for admin endpoints.
- `AMOCRM_WEBHOOK_URL` — webhook URL for real amoCRM sending (in MVP mocked when absent).
