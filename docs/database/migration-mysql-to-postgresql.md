# MySQL → PostgreSQL

Classic Way runs on **PostgreSQL 16 + psycopg (v3)** only. MySQL is not used.

| Area | Value |
|------|--------|
| Engine | PostgreSQL 16 |
| Driver | `psycopg[binary]` |
| URL | `postgresql+psycopg://classic_way:classic_way@classic-way-db:5432/classic_way` |
| Env | `POSTGRES_*` or `DATABASE_URL` |
| Docker DB | container `classic-way-db`, database `classic_way` |

## Docker (recommended)

From `D:\VT-Workspace`:

```bash
cp .env.example .env
docker compose up --build
```

Admin backend runs `alembic upgrade head` on start (schema owner).
Shopping backend uses the same Postgres database.

## Local without Docker DB

```bash
# Point POSTGRES_* at classic-way-db published port (default 5434)
cd classic-way-admin/backend
alembic upgrade head
```

Do not reintroduce MySQL drivers, `MYSQL_*` variables, or InnoDB SQL scripts.
