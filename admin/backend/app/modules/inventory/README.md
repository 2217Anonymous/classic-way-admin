# Inventory Module

Owns stock levels for products/variants, low-stock alerting, and the manual
adjustment audit trail.

## Responsibilities

- Track on-hand quantity and reserved quantity per product/variant
- Low-stock threshold configuration (singleton settings row)
- Manual stock adjustments with a `stock_movements` audit trail
- Seed `inventory_items` from `catalog` products on first read (demo convenience)

## Owned data

`inventory_settings`, `inventory_items`, `stock_movements`

## Implementation status (VL-013)

- `GET /inventory/items` — list with computed `available`/`is_low_stock`: done
- `GET /inventory/alerts` — items at or below threshold: done
- `GET`/`PUT /inventory/settings` — low-stock threshold: done
- `POST /inventory/items/{id}/adjust` — manual delta adjustment + movement log: done
- Reservation/release hooks are called by the `orders` module during
  checkout, cancellation, and payment capture.
