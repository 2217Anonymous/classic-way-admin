# Migrations note

Canonical Alembic revisions live in:

```text
admin/backend/alembic/versions/
```

This folder documents the migration ownership for the shared PostgreSQL database used by both admin and shopping backends.

Do not duplicate revision files here — run Alembic from `admin/backend`.
