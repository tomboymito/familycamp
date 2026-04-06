# FamilyCamp

MVP веб-системы автокемпинга:

- публичный сайт с бронированием без регистрации;
- FastAPI backend с проверкой пересечений и антиспамом;
- PostgreSQL-ready модель данных (spots, customers, bookings, blocks, crm_logs);
- веб-админка (`/admin`) с авторизацией, списком броней, шахматкой (14 дней), блокировками и повторной отправкой в CRM.

## Запуск

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .
uvicorn backend.app.main:app --reload
```

Откройте:

- `http://localhost:8000/` — публичный сайт.
- `http://localhost:8000/admin` — админка.

Тестовый доступ в админку (настраивается переменными окружения):

- login: `admin`
- password: `admin123`
