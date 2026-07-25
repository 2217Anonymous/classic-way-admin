# Database (PostgreSQL)

Classic Way uses **one shared PostgreSQL database** for admin and shopping.
**Production apps read/write database data only** — no frontend mock catalog.

## Docker

```bash
cd D:\VT-Workspace
docker compose up -d classic-way-db
```

| Setting | Value |
|---------|--------|
| Container | `classic-way-db` |
| Database | `classic_way` |
| User / password | `classic_way` / `classic_way` |
| Host port | `5434` → container `5432` |

## Env

```
POSTGRES_HOST=classic-way-db   # inside Docker network
POSTGRES_PORT=5432
POSTGRES_DB=classic_way
POSTGRES_USER=classic_way
POSTGRES_PASSWORD=classic_way
```

Local apps on the host use `POSTGRES_HOST=localhost` and `POSTGRES_PORT=5434`.

## Complete schema

Reference dump (all tables, sequences, constraints, indexes):

`database/schema/complete_schema.sql`

**Primary keys & foreign keys use PostgreSQL `uuid`** (generated in app via `uuid4`). Integer IDs are not used for entity keys.

Tables include: users/roles, customers/addresses, brands, categories, products (+ media, variants, attributes), inventory, carts, wishlists, compare, orders/payments/shipments, coupons, reviews/feedback, store settings, notifications, and Alembic version tracking.

Apply schema via migrations (preferred), not by hand-running the dump:

```bash
cd classic-way-admin/backend
alembic upgrade head
```

Admin API container runs `alembic upgrade head` on start.

## Bootstrap

`database/schema/init.sql` — extensions only (`pgcrypto`, `uuid-ossp`), loaded by Postgres docker entrypoint.

## Seed (optional)

```bash
cd classic-way-admin
python database/seeds/fashion_seed.py
```

Seeds write into Postgres so shopping/admin UIs show real catalog rows.

MySQL is not used.
