# Catalog Module

Owns everything required to describe and sell products.

## Responsibilities

- Categories and collections
- Products, variants, attributes, pricing, and SKUs
- Product media and publish status

Stock balances, movements, and low-stock alerting now live in the
dedicated `inventory` module (VL-013), which seeds `inventory_items` from
these products/variants on first read.

## Owned data

`categories`, `products`, `product_variants`, `product_media`

## Public contracts

- Product administration commands
- Public catalog queries
- `check_availability(variant_id, quantity)`
- `reserve_stock(...)` and `release_stock(...)`

Publishes `product.published`, `stock.low`, and `stock.changed` events.

## Implementation status

- Categories CRUD (flat + nested via `parent_id`, `is_active`, slug, sort order): done
- Products + media create/edit (VL-011): done
- Product attributes + variants with SKU/price/stock overrides (VL-012): done
- Inventory alerts: moved to the `inventory` module (VL-013); the public
  `storefront` module reuses `ProductService` for read-only catalog browsing
  (VL-014)
