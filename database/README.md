# Database

PostgreSQL 16 is the system of record for Valaiyagam.

## Layout

```text
database/
├── schema/
│   └── init.sql          # Extensions on first Postgres boot
├── seeds/
│   └── fashion_seed.py   # Fashion / T-shirt sample catalog
├── migrations/           # Notes — Alembic lives in admin/backend/alembic
└── README.md
```

## Connection

```text
postgresql+psycopg://USER:PASSWORD@HOST:5432/DB
```

Environment variables (see root `env-sample.txt`):

```text
POSTGRES_HOST
POSTGRES_PORT
POSTGRES_DB
POSTGRES_USER
POSTGRES_PASSWORD
DATABASE_URL   # optional full SQLAlchemy URL override
```

## Bootstrap

1. Create a Postgres database/user matching `POSTGRES_*`.
2. Run `database/schema/init.sql` (extensions).
3. Apply Alembic migrations (table DDL source of truth):

```bash
cd admin/backend
alembic upgrade head
```

## Seeds

```bash
cd admin/backend
python ../../database/seeds/fashion_seed.py
```

## Schema ownership

- **Extensions / timezone:** `database/schema/init.sql`
- **Tables / indexes / FKs:** `admin/backend/alembic/versions/`
- **ORM models:** `admin/backend/app/modules/*/models*`

MySQL is not used. Do not introduce `MYSQL_*` env vars or MySQL drivers.
