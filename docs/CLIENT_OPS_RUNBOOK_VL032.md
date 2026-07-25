# Client Ops Runbook (VL-032)

Daily operations guide for Classic Way admin.

## Access

- Admin URL: production admin host
- Roles: Admin (full), Manager (catalog/orders), Viewer (read-only)

## Users & roles

1. Open **Users** / **Roles**.
2. Create staff with least privilege.
3. Disable accounts via Active toggle; never share the root admin password.

## Catalog

1. **Categories** → create/edit hierarchy.
2. **Attributes** → Size/Color options.
3. **Products** → create/edit, gallery reorder, Exchangeable/Refundable, publish.
4. **Inventory** → watch low-stock alerts; Adjust stock with a reason.

## Shop settings

Profile menu → **Our shop details**, **Tax**, **Coupons**.

## Orders

1. **Orders** tab → filter by status/date.
2. Open detail → verify line items and totals.
3. COD: **Mark paid** after cash collected.
4. Cancel only when stock must be released and customer notified.

## Payments & refunds

1. Razorpay paid orders update via webhook (do not store card data).
2. Refunds: use payment refund action with amount/reason; confirm status.
3. Never process refunds outside the admin/API path.

## Shipments

1. From paid order → **Create shipment** (manual or courier adapter).
2. Print/download label URL when available.
3. Schedule pickup; add tracking events as carrier updates arrive.
4. **Exceptions**: delayed/RTO → override with audited reason.

## Customer tracking

Share `/shop/track` and the order number (`CW-…`). Customer sees Placed → Paid → Shipped → Delivered timeline.

## Notifications

**Notifications** tab shows queued/sent logs. Templates: paid, shipped, delivered.

## Reports

**Reports** tab → daily KPIs; export CSV for finance.

## Escalation

| Issue | Contact |
|-------|---------|
| Site down | DevOps on-call |
| Payment mismatch | Payments owner + Razorpay dashboard |
| Courier AWB missing | Fulfillment owner |
| Data fix needed | Engineering (never edit DB by hand in prod) |
