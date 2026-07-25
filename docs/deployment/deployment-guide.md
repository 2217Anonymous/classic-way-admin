# Deployment Guide

## Docker Compose (recommended local/prod-like)

From repo root:

```bash
cp .env.example .env
# edit secrets
docker compose up --build
```

Services:

| Service | Port |
|---------|------|
| postgres | 5432 |
| admin-backend | 8000 |
| shopping-backend | 8001 |
| admin-frontend | 3000 |
| shopping-frontend | 3001 |

## Migrations & seed

Admin backend container runs `alembic upgrade head` on start.

Seed fashion catalog:

```bash
docker compose exec admin-backend python /path/or/mount/seeds
# or locally:
cd admin/backend
# set POSTGRES_* to compose values
PYTHONPATH=. python ../../database/seeds/fashion_seed.py
```

## Local without Docker

1. Start PostgreSQL 16
2. `cd admin/backend && pip install -r requirements.txt && alembic upgrade head && uvicorn app.main:app --reload --port 8000`
3. `$env:PYTHONPATH="..\..\admin\backend"; cd shopping/backend; uvicorn main:app --reload --port 8001`
4. `cd admin/frontend && npm i && npm run dev`
5. `cd shopping/frontend && npm i && npm run dev`

## Health checks

- `GET http://localhost:8000/health`
- `GET http://localhost:8001/health`
