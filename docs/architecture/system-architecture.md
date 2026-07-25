# Valaiyagam System Architecture

## Overview

Valaiyagam is a fashion and T-shirt ecommerce platform with clearly separated admin and shopping surfaces, a shared PostgreSQL database, and FastAPI backends.

## Logical Layout

```text
Valaiyagam/
├── admin/
│   ├── frontend/     # Next.js admin dashboard (:3000)
│   └── backend/      # FastAPI admin + shared domain modules (:8000)
├── shopping/
│   ├── frontend/     # Next.js storefront (:3001)
│   └── backend/      # FastAPI customer APIs (:8001)
├── database/         # Schema docs, seeds, migration notes
├── docs/             # Architecture, API, deployment docs
├── docker-compose.yml
└── README.md
```

## Runtime Topology

```text
┌─────────────────────┐     ┌──────────────────────┐
│ Admin Frontend      │     │ Shopping Frontend    │
│ Next.js :3000       │     │ Next.js :3001        │
└──────────┬──────────┘     └──────────┬───────────┘
           │ /api/v1/admin*            │ /api/v1/*
           ▼                           ▼
┌─────────────────────┐     ┌──────────────────────┐
│ Admin Backend       │     │ Shopping Backend     │
│ FastAPI :8000       │     │ FastAPI :8001        │
└──────────┬──────────┘     └──────────┬───────────┘
           │                           │
           └────────────┬──────────────┘
                        ▼
              ┌──────────────────┐
              │ PostgreSQL 16    │
              │ Shared schema    │
              └──────────────────┘
```

## Design Principles

1. **Reuse existing domain logic** — catalog, inventory, orders, payments, fulfillment modules from the original modular monolith remain the source of truth under `admin/backend`.
2. **Separate HTTP surfaces** — admin routes stay role-gated; shopping exposes public catalog and customer JWT APIs.
3. **Shared database** — one PostgreSQL database; both backends use compatible SQLAlchemy models and Alembic migrations owned by `admin/backend` (mirrored/documented under `database/`).
4. **No fake ecommerce core** — cart, checkout, orders, coupons, and inventory write through real DB transactions.
5. **Provider abstraction** — payments use a provider interface (Razorpay demo + COD) so gateways can be swapped.

## Migration From Previous Layout

| Before | After |
|--------|-------|
| `frontend/` | `admin/frontend/` |
| `backend/` | `admin/backend/` |
| `shopping/` (BlueBerry UI) | `shopping/frontend/` |
| _(none)_ | `shopping/backend/` |
| MySQL 8.4 + PyMySQL | PostgreSQL 16 + psycopg |
| Legacy MySQL init scripts | `database/schema/init.sql` + Alembic |

## Security Boundaries

- Admin: JWT access tokens + RBAC (`admin`, `manager`, `viewer`).
- Customer: JWT access + refresh tokens; customer role distinct from staff.
- CORS restricted to configured frontend origins.
- Passwords hashed with Argon2 (`pwdlib`).
