-- PostgreSQL bootstrap (extensions / timezone).
-- Table DDL is owned by Alembic migrations in backend/alembic.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Application role/database are created by the Postgres image via POSTGRES_* env.
