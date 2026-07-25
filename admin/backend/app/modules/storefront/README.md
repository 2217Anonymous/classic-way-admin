# Storefront Module

Public, unauthenticated read surface over the `catalog` module for shoppers.

## Responsibilities

- List published, active, publicly-visible products
- Fetch a single public product by slug

## Owned data

None — this module has no tables of its own; it queries `catalog`
repositories directly and reuses `ProductService` response building.

## Implementation status (VL-014)

- `GET /store/products` — published + active + public products: done
- `GET /store/products/{slug}` — public product detail: done
