# Classic Way — T-Shirt SQL Seed Pack

Shared PostgreSQL seed for **admin-service** + **shopping-service**.

## What you get

| File | Contents |
|------|----------|
| `00_reset_seed_data.sql` | Truncate seed tables (keeps admin users/roles) |
| `01_master_catalog.sql` | Attributes, 20 brands, 12 categories, tax, store/inventory settings |
| `02_products_variants_media_inventory.sql` | 100 T-shirts, Size×Color variants, 3–6 images each, inventory |
| `03_coupons.sql` | 50 coupons |
| `04_customers_wishlist_cart.sql` | 50 customers, addresses, wishlists, sample carts |
| `05_orders_payments_shipments.sql` | 200 orders (100 paid/delivered, 50 pending, 25 cancelled, 25 returned) |
| `06_reviews_notifications.sql` | 200 reviews + marketing notifications |
| `99_verify_counts.sql` | Count + status + low-stock checks |

## Schema notes (important)

Seed matches **live columns only**:

- No `barcode` / product `gst` columns (not in schema)
- Gender / Fabric / Neck / Sleeve → `product_attributes` + `attribute_definitions`
- Size / Color sellable combos → `product_variants.options` JSON
- SEO → `products.seo_title`, `products.seo_description`
- Images stored as **public URLs** (`storage_provider = 'url'`). Replace with S3 later via `UPDATE`.

## Apply (psql)

```bash
# After alembic upgrade head
export DATABASE_URL='postgresql://classic_way:classic_way@localhost:5434/classic_way'

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/seeds/sql/00_reset_seed_data.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/seeds/sql/01_master_catalog.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/seeds/sql/02_products_variants_media_inventory.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/seeds/sql/03_coupons.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/seeds/sql/04_customers_wishlist_cart.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/seeds/sql/05_orders_payments_shipments.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/seeds/sql/06_reviews_notifications.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/seeds/sql/99_verify_counts.sql
```

## Prefer ORM seed for real password hashes

```bash
PYTHONPATH=backend python database/seeds/tshirt_full_seed.py --reset
```

Demo customer password from ORM seed: `Customer123!`

## Regenerate SQL

```bash
python database/seeds/generate_tshirt_sql.py
```

## Swap images to S3 later

```sql
UPDATE product_media
SET url = 'https://YOUR_CDN/products/tee-001/large.webp',
    storage_provider = 's3',
    large_storage_key = 'products/.../large.webp'
WHERE id = '...';
```
python database/seeds/generate_tshirt_sql.py
# then run the numbered SQL files (see database/seeds/sql/README.md)

PYTHONPATH=backend python database/seeds/tshirt_full_seed.py --reset