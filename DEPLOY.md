# FamilyCamp deploy (VPS + Docker + managed PostgreSQL)

## 1. Prepare env
Create `camping-main/.env` from `camping-main/.env.example` and set:
- DB credentials for managed PostgreSQL
- CRM settings (optional)
- CORS settings

## 2. Run services
```bash
docker compose up -d --build
```

## 3. Open app
- Frontend: `http://<server-ip>/`
- Backend docs: `http://<server-ip>/docs`
- Health: `http://<server-ip>/health`

## Notes
- Nginx serves `frontend/index.html` and proxies API endpoints to FastAPI container.
- PostgreSQL is expected to be external (managed), not part of compose.
