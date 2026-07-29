# admin-service — Production Architecture

Enterprise backend for **administrative operations only**.  
Stack: **Python 3.13 · FastAPI · SQLAlchemy Async · PostgreSQL · Alembic · Redis · JWT · Docker · AWS S3**.

Shopping / customer commerce APIs live in **shopping-service**. Both services share one PostgreSQL database.

---

## 1. Responsibility boundary

| In scope (admin-service) | Out of scope (shopping-service) |
|---|---|
| Staff auth, RBAC, audit | Customer register/login/sessions |
| Catalog / inventory / warehouse CRUD | Cart, wishlist, compare |
| Coupons, offers, banners, settings | Storefront browse/search |
| Order ops, refunds, returns, shipments | Checkout placement |
| Customer CRM + review moderation | Customer self-service profile |
| Dashboard, reports, analytics | Public tracking pages |
| Product media (S3) | Payment webhook *initiation* (may stay shared) |

**Rule:** if an endpoint exists to help a shopper buy, it does **not** belong here.

---

## 2. System context

```text
┌─────────────────┐     JWT (staff)      ┌──────────────────┐
│  Admin Frontend │ ───────────────────► │  admin-service   │
└─────────────────┘                      │  :8000           │
                                         └────────┬─────────┘
                                                  │
         shared PostgreSQL ◄──────────────────────┤
                                                  │
┌─────────────────┐     JWT (customer)   ┌────────▼─────────┐
│ Shop Frontend   │ ───────────────────► │ shopping-service │
└─────────────────┘                      └──────────────────┘

admin-service also uses: Redis · S3 · (optional) worker queue
```

### Synchronization model

- Admin owns master tables. Writes commit to Postgres.
- Shopping reads the same rows → **instant visibility**.
- **No master-data sync APIs.**
- Optional Redis caches must be invalidated (or short TTL) on admin writes.
- Shared transactional tables (`orders`, `payments`, `shipments`, …) are updated by both under **documented write contracts**.

---

## 3. Clean Architecture layout

```text
admin-service/
├── app/
│   ├── main.py                 # composition root (admin routers only)
│   ├── core/
│   │   ├── config.py
│   │   ├── database.py         # AsyncEngine + AsyncSession
│   │   ├── security.py         # JWT, password hashing
│   │   ├── redis.py
│   │   ├── logging.py
│   │   └── constants.py
│   ├── dependencies/
│   │   ├── auth.py             # get_current_admin_user
│   │   ├── rbac.py             # require_permission(...)
│   │   ├── db.py               # get_db AsyncSession
│   │   └── pagination.py
│   ├── middleware/
│   │   ├── request_id.py
│   │   ├── timing.py
│   │   └── audit_context.py
│   ├── handlers/
│   │   └── exceptions.py       # centralized AppError → JSON
│   ├── storage/
│   │   ├── base.py
│   │   ├── s3.py
│   │   ├── local.py
│   │   └── factory.py
│   ├── events/
│   │   ├── bus.py
│   │   └── types.py            # ProductUpdated, StockLow, OrderStatusChanged
│   ├── tasks/
│   │   ├── excel_import.py
│   │   ├── excel_export.py
│   │   ├── low_stock_alert.py
│   │   └── report_export.py
│   ├── utils/
│   │   ├── ids.py
│   │   └── excel.py
│   └── modules/
│       ├── auth/
│       ├── users/
│       ├── iam/                # roles + permissions
│       ├── dashboard/
│       ├── catalog/            # categories, brands, products, variants, images
│       ├── inventory/          # stock + warehouses
│       ├── promotions/         # coupons, offers, banners
│       ├── orders/             # orders, returns, invoices, timeline
│       ├── payments/
│       ├── fulfillment/        # shipments
│       ├── customers/          # CRM + review moderation
│       ├── notifications/
│       ├── reporting/          # analytics + reports
│       ├── settings/
│       └── audit/
│
│   # Per-module package shape (Clean Architecture):
│   #   routes/  services/  repositories/  models/  schemas/  sql/
│
├── alembic/
│   ├── env.py                  # async migrations
│   └── versions/
├── sql/                        # optional cross-cutting views / grants
│   ├── grants_shopping_readonly.sql
│   └── views_dashboard.sql
├── tests/
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── .env.example
```

### Layer rules

| Layer | Allowed | Forbidden |
|---|---|---|
| **routes** | Auth deps, request parsing, call service, return schema | SQL, business rules |
| **services** | Domain logic, transactions, events, cache invalidation | Direct HTTP concerns |
| **repositories** | Async SQLAlchemy queries | Business branching, HTTP |
| **models** | ORM mapping | Pydantic / API shapes |
| **schemas** | Request/response DTOs | DB sessions |
| **sql** | Raw SQL views, grants, seed helpers | Application flow control |
| **tasks** | Long-running / async jobs | Synchronous request path |
| **events** | Decoupled side-effects | Circular module imports |

Cross-module rule: services may call **other modules’ public service interfaces**, never their repositories.

---

## 4. Database ownership

### Admin-owned (full CRUD)

`categories`, `brands`, `products`, `product_variants`, `product_media`,  
`inventory_items`, `stock_movements`, `warehouses`,  
`coupons`, `offers`, `banners`, `settings` (store/tax/theme),  
`roles`, `permissions`, `user_roles`, `role_permissions`, `admin_users`, `audit_logs`

### Shopping-owned (admin: read-only / support views)

`carts`, `cart_items`, `wishlists`, `compare_items`,  
`customer_addresses`, `customer_sessions` / refresh tokens

### Shared transactional

`customers`, `orders`, `order_items`, `order_status_history`,  
`payments`, `payment_events`, `refunds`,  
`shipments`, `shipment_events`,  
`notifications`, `reviews`, `ratings`

### Recommended Postgres roles (production)

```sql
-- shopping-service DB role: SELECT on master tables; INSERT/UPDATE on owned + shared tx
GRANT SELECT ON categories, brands, products, product_variants, inventory_items,
  coupons, offers, banners, warehouses, store_settings TO shopping_app;

-- admin-service: ALL on owned + shared
GRANT ALL ON ALL TABLES IN SCHEMA public TO admin_app;
```

### Inventory single source of truth

- **`inventory_items`** (per warehouse × product/variant) is authoritative.
- Deprecate denormalized `products.stock` (keep as cached read model only if needed).
- Shopping decrements/reserves via DB transactions + row locks / optimistic version.
- Cancel/refund restores via compensating `stock_movements` with **idempotency keys**.

---

## 5. Modules & API surface (`/api/v1`)

All routes require staff JWT unless noted. Use `require_permission("resource:action")`.

### 5.1 Authentication

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/login` | username/password → access + refresh |
| POST | `/auth/refresh` | rotate tokens; Redis denylist support |
| POST | `/auth/logout` | revoke refresh + denylist access jti |
| GET | `/auth/me` | current admin + permissions |

### 5.2 Admin Users / Roles / Permissions

| Method | Path |
|---|---|
| GET/POST | `/users` |
| GET/PATCH/DELETE | `/users/{id}` |
| POST | `/users/{id}/roles` |
| GET/POST | `/roles` |
| GET/PATCH | `/roles/{id}` |
| PUT | `/roles/{id}/permissions` |
| GET | `/permissions` |

### 5.3 Dashboard / Analytics / Reports

| Method | Path | Cache |
|---|---|---|
| GET | `/dashboard/summary` | Redis 30–60s |
| GET | `/dashboard/sales/today` | |
| GET | `/dashboard/orders/today` | |
| GET | `/dashboard/revenue/monthly` | |
| GET | `/analytics/top-products` | |
| GET | `/analytics/top-categories` | |
| GET | `/analytics/low-stock` | |
| GET | `/reports/{type}` | async job → download URL |
| GET | `/reports/{job_id}` | job status |

Dashboard widgets: today’s sales/orders, monthly revenue, top products/categories, low stock, customers count, pending/completed/cancelled orders, returns, refunds, chart series.

### 5.4 Catalog — Categories / Brands / Products

| Method | Path |
|---|---|
| CRUD | `/categories`, `/brands` |
| POST | `/products` |
| GET | `/products`, `/products/{id}` |
| PATCH | `/products/{id}` |
| DELETE | `/products/{id}` |
| POST | `/products/{id}/enable` |
| POST | `/products/{id}/disable` |
| POST | `/products/bulk-upload` |
| PATCH | `/products/bulk-update` |
| POST | `/products/import/excel` |
| GET | `/products/export/excel` |
| CRUD | `/products/{id}/variants` |
| POST | `/products/{id}/images` |
| DELETE | `/products/{id}/images/{image_id}` |
| PATCH | `/products/{id}/images/reorder` |

Excel import/export: enqueue `tasks/excel_*`; poll job or push notification when ready. Files land in S3.

### 5.5 Inventory / Warehouse

| Method | Path |
|---|---|
| GET | `/inventory` |
| POST | `/inventory/stock-in` |
| POST | `/inventory/stock-out` |
| POST | `/inventory/adjustments` |
| POST | `/inventory/transfers` |
| GET | `/inventory/history` |
| GET | `/inventory/low-stock` |
| CRUD | `/warehouses` |

Each mutation writes `stock_movements` + audit log.

### 5.6 Promotions — Coupons / Offers / Banners

| Method | Path |
|---|---|
| CRUD | `/coupons`, `/offers`, `/banners` |
| POST | `/coupons/{id}/enable\|disable` |
| GET | `/coupon-usages` | Admin analytics |

### 5.7 Orders / Returns / Shipments / Payments

| Method | Path |
|---|---|
| GET | `/orders`, `/orders/{id}` |
| GET | `/orders/{id}/timeline` |
| POST | `/orders/{id}/approve` | → Confirmed |
| POST | `/orders/{id}/cancel` | restore inventory |
| POST | `/orders/{id}/status` | Confirmed\|Packed\|Shipped\|Delivered\|Cancelled\|Returned\|Refunded |
| GET | `/orders/{id}/invoice` | PDF/HTML generation |
| POST | `/orders/{id}/shipments` | assign courier |
| PATCH | `/shipments/{id}` | tracking updates |
| GET | `/shipments/{id}` | |
| POST | `/returns/{id}/approve` | |
| POST | `/returns/{id}/reject` | |
| GET | `/payments` | |
| POST | `/refunds` | |

**Status visibility:** shopping-service reads the same `orders.status` / history rows — no webhook required for admin→shop visibility (optional Redis pub/sub for live UI).

### 5.8 Customers / Reviews / Notifications / Settings / Audit

| Method | Path |
|---|---|
| GET/PATCH | `/customers`, `/customers/{id}` |
| GET/PATCH | `/reviews` (moderate / hide) |
| GET/POST | `/notifications` |
| GET/PUT | `/settings/store`, `/settings/theme`, `/settings/tax` |
| GET | `/audit-logs` | filter by actor, entity, date |

---

## 6. Cross-cutting concerns

### JWT + RBAC

```text
Access token claims:
  sub = admin_user_id
  typ = access
  roles = [...]
  perms = ["products:write", "orders:refund", ...]   # or load from Redis/DB
  jti = uuid
```

- Refresh tokens stored hashed (DB or Redis) with rotation.
- Logout / password change → denylist `jti` in Redis until expiry.
- Dependency: `require_permission("orders:write")`.
- Seed roles: `super_admin`, `admin`, `manager`, `warehouse`, `support`, `viewer`.

### Audit logs

Every mutating service method writes:

`actor_id, action, entity_type, entity_id, before, after, ip, request_id, created_at`

Immutable append-only table. Prefer DB trigger or service-layer write in same transaction.

### Redis

| Use | Key pattern | TTL |
|---|---|---|
| Dashboard summary | `admin:dash:summary` | 30–60s |
| Permission set | `admin:perms:{user_id}` | 5–15m |
| Token denylist | `auth:deny:{jti}` | token TTL |
| Idempotency | `idem:{key}` | 24h |
| Low-stock lock | `lock:lowstock` | short |

Invalidate catalog/settings caches on write:

```python
await redis.delete("shop:product:{id}", "shop:catalog:list:*", ...)
```

(Coordinate key naming with shopping-service.)

### Exception handling

Central `handlers/exceptions.py`:

- `AppError` → structured `{code, message, details}`
- `RequestValidationError` → 422
- Unhandled → 500 + request_id (no stack to client)

### API versioning

- Prefix: `/api/v1`
- Future breaking changes → `/api/v2` routers; keep v1 until deprecation window.

### Background tasks

Prefer Redis-backed queue (ARQ / Celery / Taskiq):

- Excel import/export
- Invoice PDF
- Low stock alerts → notifications
- Heavy report generation
- Orphan S3 cleanup

### Storage (S3)

- `STORAGE_PROVIDER=s3` in production.
- Product image pipeline: original → thumb / card / zoom variants (existing image processing).
- Store only keys in DB; signed or CDN URLs in API responses.

---

## 7. Shopping integration contracts

| Event | Actor | Admin sees | Inventory |
|---|---|---|---|
| Order created | Shopping | Immediately in `/orders` + dashboard | Reserved/decremented |
| Payment captured | Shopping / gateway | `/payments` | — |
| Status change | Admin | Shopping order detail | Cancel/refund restores |
| Shipment tracking | Admin / courier | Both via `shipments` | — |
| Return approved | Admin | Shared return/order status | Restock per policy |
| Refund completed | Admin | Shared `refunds` | Restock if policy says so |

**Idempotency:** all stock mutations and refunds accept `Idempotency-Key` header.

**Order status machine (admin-controlled transitions):**

```text
pending → confirmed → packed → shipped → delivered
                 ↘ cancelled
delivered → returned → refunded
cancelled → (optional) refunded
```

Illegal transitions raise `409 Conflict`.

---

## 8. Docker / runtime

```yaml
# docker-compose (admin-service slice)
services:
  admin-api:
    build: .
    env_file: .env
    ports: ["8000:8000"]
    depends_on: [redis]
    command: >
      sh -c "alembic upgrade head &&
             uvicorn app.main:app --host 0.0.0.0 --port 8000"

  admin-worker:
    build: .
    env_file: .env
    command: python -m app.tasks.worker
    depends_on: [redis]

  redis:
    image: redis:7-alpine
```

Postgres is external (shared with shopping-service on Docker network `classic-way`).

Env essentials:

```text
APP_NAME=admin-service
DATABASE_URL=postgresql+asyncpg://...
REDIS_URL=redis://redis:6379/0
JWT_SECRET=...
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
STORAGE_PROVIDER=s3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...
AWS_REGION=...
CORS_ORIGINS=https://admin.example.com
```

---

## 9. Implementation guidelines

1. **Async everywhere:** `AsyncSession`, `asyncpg`, no blocking I/O in request path (offload Excel/PDF to workers).
2. **Unit of work:** one service method = one transaction; commit in route dependency or service boundary consistently.
3. **Repositories return entities / rows; services return domain results / schemas.**
4. **Never import shopping routers into `main.py`.**
5. **Schema-first APIs:** OpenAPI tags per module; examples for status transitions.
6. **Tests:** repository integration tests against Postgres; service unit tests with fakes; API tests for RBAC denial paths.
7. **Observability:** structured JSON logs with `request_id`; metrics for order status latency & inventory conflicts.
8. **Migrations:** Alembic owns all DDL; module `sql/` holds grants/views only.
9. **Security:** rate-limit login; Argon2/bcrypt passwords; least-privilege DB role; S3 private bucket + signed URLs.

---

## 10. Migration from current codebase

Current `backend/` is a modular monolith that still mounts shopping routes (`/cart`, `/orders/checkout`, `/store`, public `/track`).

| Phase | Work |
|---|---|
| **P0 Boundary** | Remove shopping routers from admin `main.py`; rename service to `admin-service` |
| **P1 Async** | `AsyncEngine` + async repositories; Alembic async env |
| **P2 Redis** | Dashboard cache, permission cache, token denylist |
| **P3 RBAC** | `permissions` table + `require_permission` (beyond role names) |
| **P4 Inventory** | Unify on `inventory_items`; warehouse transfers; movement history |
| **P5 Jobs** | Excel import/export + low-stock alerts as workers |
| **P6 Audit** | Mandatory audit on all mutating admin APIs |
| **P7 Harden** | DB grants for shopping read-only masters; S3-only media in prod |

Keep existing domain modules (`catalog`, `inventory`, `orders`, …) but reshape each to `routes/services/repositories/models/schemas/sql` and strip cross-module repository imports.

---

## 11. Sample service flow (order cancel)

```text
routes/orders.py  PATCH /orders/{id}/cancel
        │
        ▼
dependencies.rbac.require_permission("orders:cancel")
        │
        ▼
services/order_service.cancel(order_id, reason, actor)
        │  begin transaction
        ├─► repositories/order_repo.lock_for_update()
        ├─► validate status machine
        ├─► order.status = cancelled + timeline row
        ├─► inventory_service.restore_for_order(order_id, idempotency_key)
        ├─► audit_service.write(...)
        ├─► events.publish(OrderCancelled)
        │  commit
        ▼
tasks (optional): notify customer via notifications module
```

Shopping UI refreshes order from shared DB → sees `cancelled` immediately.

---

## 12. Definition of done (production)

- [ ] No customer shopping endpoints mounted
- [ ] Async SQLAlchemy + Alembic green
- [ ] JWT + fine-grained RBAC on every mutating route
- [ ] Audit log coverage ≥ all write APIs
- [ ] Redis used for cache / denylist / idempotency
- [ ] S3 media in non-local environments
- [ ] Inventory movements for stock-in/out/adjust/transfer/order restore
- [ ] Dashboard KPIs match shared order/payment data
- [ ] Docker image + worker + Redis compose
- [ ] OpenAPI published under `/api/v1/docs`
- [ ] Integration tests for order status + stock restore
)
