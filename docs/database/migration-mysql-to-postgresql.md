# MySQL → PostgreSQL (historical)

Valaiyagam now runs exclusively on **PostgreSQL 16 + psycopg (v3)**.

The legacy `mysql/` bootstrap directory has been **removed**. Use:

| Concern | Location |
|---------|----------|
| Extensions | `database/schema/init.sql` |
| Table DDL | `backend/alembic/versions/` |
| Env sample | root `env-sample.txt` / `backend/.env.example` |

## What changed (summary)

| Area | Before | After |
|------|--------|-------|
| Engine | MySQL 8.4 | PostgreSQL 16 |
| Driver | `pymysql` | `psycopg[binary]` |
| URL | `mysql+pymysql://...` | `postgresql+psycopg://...` |
| Env vars | `MYSQL_*` | `POSTGRES_*` / `DATABASE_URL` |

## Fresh environment

```bash
# 1. Create Postgres DB/user from env-sample.txt
# 2. Apply extensions
psql -U valaiyagam -d valaiyagam -f database/schema/init.sql

# 3. Apply migrations
cd backend
alembic upgrade head
```

Do not reintroduce MySQL drivers, `MYSQL_*` variables, or InnoDB SQL scripts.
