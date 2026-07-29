# Theme Settings

Shared `theme` table (UUID PKs) stores:

- **Default theme**: `customer_id IS NULL`, `is_default = true`
- **Customer theme**: one row per `customer_id` (unique)

## Admin API

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/v1/theme/default` | Manager/Viewer | Read global default |
| PUT | `/api/v1/theme/default` | Admin | Update global default only |

Admin UI: **Settings → Theme Settings** (`/?tab=theme`)

## Shopping API

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/v1/theme` | Optional | Guest → default; logged-in → customer or default |
| PUT | `/api/v1/theme` | Customer | Upsert own theme (`customer_id` from JWT only) |

## Migration

`classic-way-admin/backend/alembic/versions/20260725_0013_create_theme.py`

```bash
cd classic-way-admin/backend
alembic upgrade head
```

## Shopping UI

- Floating ⚙ (logged-in only) → Theme Settings drawer
- Old Classic/Banner/Columns layout mega-menus removed from Header/MobileMenu
- Nav Home/Shop/Blog/Pages driven by `themeResolver` + page visibility
