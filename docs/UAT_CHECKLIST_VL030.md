# UAT Script & Bugfix (VL-030)

Use this checklist against Classic Way admin + storefront before client sign-off.

## Environment

- Admin: http://localhost:3000
- Storefront: http://localhost:3000/shop
- API: http://localhost:8000/health
- Login: `admin@example.com` / `ChangeMe123!`

## Smoke path (critical)

1. Sign in to admin.
2. Catalog: open Products, edit a product, toggle Exchangeable/Refundable, reorder gallery, save.
3. Inventory (`/?tab=inventory`): confirm stock list, adjust quantity, set low-stock threshold, see alerts.
4. Storefront `/shop`: browse products, open detail, Add to cart.
5. Cart `/shop/cart`: change qty, remove line, proceed to checkout.
6. Checkout `/shop/checkout`: enter address, get shipping quote, choose COD or Razorpay (demo), place order.
7. Order confirmation shows `CW-…` number; open Track.
8. Admin Orders (`/?tab=orders`): find order, open detail, Mark paid (if COD), Cancel path tested on a draft/pending order.
9. Payments: create Razorpay demo payment + webhook (`X-Demo-Signature: ok`) path via API or admin mark-paid.
10. Shipments (`/?tab=shipments`): create shipment, schedule pickup, add event, view timeline.
11. Exceptions (`/?tab=exceptions`): flag override with reason.
12. Notifications (`/?tab=notifications`): send test paid/shipped/delivered template.
13. Reports (`/?tab=reports`): KPIs load; download CSV.
14. Settings: Profile, Shop, Tax, Coupons still save.

## Severity rules

| Severity | Meaning | Exit criteria |
|----------|---------|---------------|
| Critical | Checkout/payment/order broken | Must be fixed before sign-off |
| Major | Admin ops blocked | Fix in bugfix sprint |
| Minor | UI polish / copy | Can defer with note |

## Sign-off

| Role | Name | Date | Result |
|------|------|------|--------|
| Client UAT | | | Pass / Fail |
| QA lead | | | Pass / Fail |

Defects log: track in GitHub Issues with labels `uat`, Story ID (`VL-0xx`).
