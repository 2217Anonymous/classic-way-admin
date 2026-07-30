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

**Primary keys & foreign keys use PostgreSQL `uuid`**. Apply schema via migrations:

```bash
cd classic-way-admin/backend
alembic upgrade head
```

## T-Shirt seed (SQL pack)

Full ecommerce seed for listing, filters, cart, checkout, orders, payments,
shipments, reviews, and admin dashboard:

| Path | Purpose |
|------|---------|
| `database/seeds/sql/` | Transaction-safe SQL scripts (`00`–`06` + verify) |
| `database/seeds/generate_tshirt_sql.py` | Regenerates the SQL pack |
| `database/seeds/tshirt_full_seed.py` | ORM seed (real password hashes) |

```bash
# Generate / refresh SQL files
python database/seeds/generate_tshirt_sql.py

# Apply (after migrations)
psql "postgresql://classic_way:classic_way@localhost:5434/classic_way" -v ON_ERROR_STOP=1 \
  -f database/seeds/sql/00_reset_seed_data.sql \
  -f database/seeds/sql/01_master_catalog.sql \
  -f database/seeds/sql/02_products_variants_media_inventory.sql \
  -f database/seeds/sql/03_coupons.sql \
  -f database/seeds/sql/04_customers_wishlist_cart.sql \
  -f database/seeds/sql/05_orders_payments_shipments.sql \
  -f database/seeds/sql/06_reviews_notifications.sql \
  -f database/seeds/sql/99_verify_counts.sql
```

Or seed via ORM (recommended for customer login hashes):

```bash
PYTHONPATH=backend python database/seeds/tshirt_full_seed.py --reset
```

Demo customer password (ORM seed): `Customer123!`

See `database/seeds/sql/README.md` for schema notes and S3 image URL swap examples.

## Bootstrap

`database/schema/init.sql` — extensions only (`pgcrypto`, `uuid-ossp`).

MySQL is not used.
