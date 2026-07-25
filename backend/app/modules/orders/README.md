# Orders Module

Owns the shopping cart, checkout, customer addresses, shipping-rate quotes,
and the order lifecycle.

## Responsibilities

- Cart creation and line-item management (`carts`, `cart_items`)
- Customer address book (`customer_addresses`)
- Demo shipping-rate quotes (no live courier API required)
- Checkout: validates the cart, resolves the shipping address, applies a
  coupon (via `settings.CouponRepository`), reserves inventory (via
  `inventory.InventoryItemRepository`), and creates the order
- Order lifecycle: `pending` → `paid`/`cancelled`/`refunded`, with a full
  `order_status_history` audit trail

## Owned data

`carts`, `cart_items`, `customer_addresses`, `orders`, `order_items`,
`order_status_history`

## Implementation status (VL-015 to VL-018)

- `POST/GET /cart`, item add/update/delete: done
- `GET/POST/PATCH/DELETE /addresses`: done
- `POST /shipping/quote`: done (flat-rate + free-shipping-threshold demo logic)
- `POST /orders/checkout`: done — reserves stock, snapshots cart into
  `order_items`, records initial status history, clears the cart
- `GET /orders`, `GET /orders/{id}`: done
- `POST /orders/{id}/cancel`: done — releases reserved stock
- `POST /orders/{id}/mark-paid`: done — deducts stock, also called by the
  `payments` module webhook handler on successful capture
- Coupons are consumed from `settings.coupons`; tax rules from
  `settings.tax_rules` are not yet applied to order totals (follow-up)
