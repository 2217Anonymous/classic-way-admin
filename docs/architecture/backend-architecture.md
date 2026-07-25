# Backend Architecture

## Surfaces

| App | Path | Port | Role |
|-----|------|------|------|
| Admin API | `backend` | 8000 | Staff JWT, catalog CRUD, inventory, orders ops, reports |
| Shopping API | `shopping/backend` | 8001 | Customer JWT, public catalog, cart, checkout |

Shopping reuses `backend` domain modules (`app.modules.*`) via `PYTHONPATH` / Docker COPY. Models and Alembic stay in one place.

## Layering

```text
API Router
  → Service (business rules)
    → Repository (SQLAlchemy)
      → PostgreSQL
```

## Domains (`backend/app/modules`)

| Module | Responsibility |
|--------|----------------|
| identity | Admin users + login |
| iam | Roles / RBAC |
| catalog | Categories, products, brands, attributes, variants, media |
| customers | Shopper auth, wishlist, compare, reviews, storefront APIs |
| orders | Cart, addresses, shipping, checkout |
| inventory | Stock + movements |
| payments | Provider abstraction + refunds |
| fulfillment | Shipments + public tracking |
| settings | Store, tax, coupons |
| notifications | Outbound notices |
| reporting | Admin summaries |
| storefront | Legacy public product list (admin API) |

## Auth

- Admin: access JWT, roles `admin` / `manager` / `viewer`
- Customer: access + refresh JWT (`scope=customer`), refresh token rows hashed in DB

## Errors

Central `AppError` hierarchy → JSON `{ "detail": "..." }`.
