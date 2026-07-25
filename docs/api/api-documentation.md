# API Documentation

## Base URLs

| Surface | Base |
|---------|------|
| Admin | `http://localhost:8000/api/v1` |
| Shopping | `http://localhost:8001/api/v1` |
| OpenAPI | `/docs` on each backend |

## Shopping (customer)

### Auth
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refresh`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /auth/me`

### Profile & addresses
- `GET|PUT /customers/me`
- `PUT /customers/me/password`
- `GET|POST /addresses`, `GET|PUT|DELETE /addresses/{id}`, `PUT /addresses/{id}/default`

### Catalog
- `GET /products` (filters: search, category, brand, size, color, min_price, max_price, rating, discount, availability, sort, page, limit)
- `GET /products/{id}`, `/products/slug/{slug}`
- `GET /products/featured|trending|best-sellers|new-arrivals`
- `GET /products/search`, `/products/suggestions`
- `GET /products/{id}/related|reviews|variants`
- `GET /categories`, `/categories/{slug}`, `/categories/{slug}/products`
- `GET /brands`

### Cart / wishlist / compare
- `GET|DELETE /cart`, `POST /cart/items`, `PUT|DELETE /cart/items/{id}`, `POST /cart/merge`
- Wishlist & compare item APIs under `/wishlist`, `/compare`

### Coupons / checkout / payments / orders
- `POST /coupons/validate|apply`, `DELETE /coupons/remove`
- `POST /checkout/preview|validate|create-order`
- `POST /payments/create|verify|webhook|retry`
- `GET /orders`, `GET /orders/{id}`, tracking/cancel/return/reorder/invoice routes

## Admin (staff)

Existing modular monolith routes under `/api/v1` on port 8000: auth, users, roles, products, categories, attributes, inventory, orders, payments, shipments, coupons, tax, reports, notifications, store settings. See `/docs` on the admin API for the live schema.
