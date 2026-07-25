# Database Schema Overview

PostgreSQL 16. DDL is applied by Alembic (`backend/alembic`).

## Core tables

### Identity / admin
- `users`, `roles`, `user_roles`

### Customers
- `customers`, `refresh_tokens`
- `wishlists`, `wishlist_items`
- `compare_lists`, `compare_items`
- `reviews`, `review_images`
- `coupon_usages`

### Catalog
- `brands`, `categories`
- `products` (flags: featured/trending/best_seller, soft `deleted_at`, SEO fields)
- `product_media`, `product_attributes`, `product_variants`
- `attribute_definitions`

### Commerce
- `carts`, `cart_items`
- `customer_addresses` (optional `customer_id` / `user_id`)
- `orders`, `order_items`, `order_status_history`
- `coupons`, `tax_rules`, `store_settings`

### Inventory / payments / fulfillment
- `inventory_settings`, `inventory_items`, `stock_movements`
- `payments`, `payment_events`, `refunds`
- `courier_accounts`, `shipments`, `shipment_events`
- `notifications`

## Conventions

- Integer PKs (existing); UUIDs optional for future tables via `pgcrypto`
- Audit: `created_at`, `updated_at` on most entities
- Soft delete: `deleted_at` on customers/products where applicable
- JSON columns for variant options / attribute values (JSONB-compatible on Postgres)
