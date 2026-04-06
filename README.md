# FamilyCamp MVP

Проект теперь включает:

- `frontend/` — публичный сайт с формой бронирования и UX-защитами.
- `backend/` — FastAPI API, PostgreSQL-ready схема, логика бронирования, anti-spam и CRM retry.
- `admin/` — MVP админка с шахматкой (даты по горизонтали, места по вертикали).

## API (MVP)

- `POST /booking`
- `GET /availability`
- `GET /admin/bookings`
- `PATCH /booking/{id}`
- `POST /crm/retry`

Подробнее по запуску backend в `backend/README.md`.
