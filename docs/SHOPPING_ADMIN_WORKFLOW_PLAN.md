# Valaiyagam — Shopping Site Story & Workflow Plan

**Product:** Fashion & T-Shirt Ecommerce (Admin + Shopping)  
**Date:** 25 July 2026  
**Architecture:** Same layered stack as admin — Next.js + Redux / FastAPI Route→Service→Repository / PostgreSQL  
**Theme:** BlueBerry fashion template in `shopping/frontend`  
**Tracker:** `docs/PROJECT_TRACKING.xlsx` (stories VL-* + VS-*)

---

## 1. Goal

Deliver a production shopping site that is **fully driven by the admin portal**:

| Admin action | Shopping result |
|---|---|
| Create category / brand | Appears in shop filters & menus |
| Upload product + images + variants | Visible on PDP when published |
| Publish product (`is_published` + public) | Live on home / shop / search |
| Unpublish or soft-delete | Disappears from storefront |
| Adjust stock / inventory | Availability updates on cart/checkout |
| Create / activate coupon | Validated at shopping checkout |
| Customer places order | Row appears in Admin → Orders |
| Mark paid / create shipment | Customer track page updates |
| Approve review | Review shows on product page |

---

## 2. Architecture (aligned with admin)

```text
┌──────────────────────┐     ┌──────────────────────────┐
│ Admin Frontend       │     │ Shopping Frontend        │
│ admin/frontend :3000 │     │ shopping/frontend :3001  │
│ Glass admin + tabs   │     │ BlueBerry fashion theme  │
└──────────┬───────────┘     └────────────┬─────────────┘
           │ /api/v1 (staff JWT)          │ /api/v1 (customer JWT)
           ▼                              ▼
┌──────────────────────┐     ┌──────────────────────────┐
│ Admin Backend :8000  │     │ Shopping Backend :8001   │
│ catalog, orders,     │     │ customers module         │
│ inventory, payments… │     │ (reuses admin/backend)   │
└──────────┬───────────┘     └────────────┬─────────────┘
           │                              │
           └────────────┬─────────────────┘
                        ▼
              ┌──────────────────┐
              │ PostgreSQL 16    │
              │ Shared schema    │
              └──────────────────┘
```

**Same patterns as admin:**

- Route → Service → Repository → Model  
- Pydantic request/response schemas  
- JWT auth (staff vs customer scope)  
- Alembic migrations in `admin/backend/alembic`  
- Feature branches + Excel story IDs  

---

## 3. End-to-end workflows (step by step)

### Workflow A — Publish product (Admin → Shopping)

```text
1. Admin login (:3000)
2. Categories → create Men / Women / Unisex / T-Shirts
3. Attributes → Size, Color (optional definitions)
4. Products → New product
   - Name, slug, description, price, MRP, SKU
   - Category, brand, tags
   - Upload images (primary + gallery)
   - Variants: size × color, SKU, stock, price
   - Set is_published = true, visibility = public
   - Optional: featured / trending / best-seller flags
5. Inventory → confirm stock / low-stock threshold
6. Save

Shopping verification (:3001)
7. Home → product appears in New Arrivals / Featured (if flagged)
8. Shop → filter by category / size / color / brand
9. Open PDP → gallery, variants, stock status
10. Search → product found by name/SKU
```

**Acceptance:** Unpublished product never appears on shopping; publishing reflects within next API fetch (no redeploy).

---

### Workflow B — Place order (Shopping → Admin)

```text
1. Customer registers / logs in (:3001)  OR guest cart
2. Browse → Add to cart (size/color/qty)
3. Optional: Apply coupon
4. Checkout → select/add address → shipping → payment (COD / Razorpay)
5. Create order → confirmation + order number

Admin verification (:3000)
6. Orders tab → new order with customer, lines, totals, coupon
7. Inventory → reserved/deducted stock visible
8. Payments tab → payment row (COD pending or Razorpay created/paid)
```

**Acceptance:** Same `orders.id` / `order_number` in DB; admin can open full detail without re-entry.

---

### Workflow C — Fulfillment & track (Admin → Shopping)

```text
1. Admin → Orders → Mark paid (COD) if needed
2. Admin → Shipments → create shipment, AWB, pickup
3. Admin → add shipment events (packed / shipped / out for delivery / delivered)
4. Optional → send notification

Customer (:3001)
5. Track Order → enter order number
6. Timeline shows status history (+ AWB when available)
7. After delivery → submit product review
```

**Acceptance:** Track page reflects admin status changes; review appears after approval.

---

### Workflow D — Catalog change after publish

```text
1. Admin edits price / image / stock / unpublish
2. Shopping PDP/list refreshes with new data
3. Cart lines keep price snapshot until checkout (documented behavior)
```

---

### Workflow E — Coupon & offers

```text
1. Admin → Coupons → create percent/fixed, min order, dates, max uses
2. Shopping → apply at cart/checkout
3. Admin → order shows discount + coupon_usages row
```

---

## 4. Story map (shopping-focused)

Stories use IDs **VS-001…VS-028** (Shopping Sync). Existing **VL-001…VL-032** remain foundation/admin. See Excel for full fields.

### Epic S1 — Theme & storefront shell
| ID | Title | Priority |
|----|-------|----------|
| VS-001 | Fashion theme baseline (BlueBerry) wired to Valaiyagam brand | P0 |
| VS-002 | Shopping SiteShell: header/footer/mobile from live categories API | P0 |
| VS-003 | Remove static catalog fallback for published products | P0 |

### Epic S2 — Catalog reflection
| ID | Title | Priority |
|----|-------|----------|
| VS-004 | Admin publish → shopping list/detail sync (E2E) | P0 |
| VS-005 | Category tree sync to shop sidebar & menus | P0 |
| VS-006 | Product media gallery sync | P0 |
| VS-007 | Variants size/color selection + filters | P0 |
| VS-008 | Brand CRUD in admin + shopping brand filter | P1 |
| VS-009 | Merchandising flags UI (featured/trending/best-seller) | P1 |
| VS-010 | Search & suggestions against live catalog | P1 |

### Epic S3 — Customer commerce
| ID | Title | Priority |
|----|-------|----------|
| VS-011 | Customer register/login/refresh/logout | P0 |
| VS-012 | Guest cart + merge after login | P0 |
| VS-013 | Wishlist & compare (API + theme pages) | P1 |
| VS-014 | Address book CRUD + default | P0 |
| VS-015 | Checkout preview/validate/create-order | P0 |
| VS-016 | Coupon validate/apply/remove on cart | P1 |
| VS-017 | COD + Razorpay payment create/verify | P0 |

### Epic S4 — Admin ops reflection
| ID | Title | Priority |
|----|-------|----------|
| VS-018 | Shopping order visible in Admin Orders instantly | P0 |
| VS-019 | Admin mark-paid / cancel updates shopping order APIs | P0 |
| VS-020 | Inventory reserve/deduct on shopping checkout | P0 |
| VS-021 | Admin Customers console (list/search/disable) | P1 |
| VS-022 | Coupon usage audit in admin | P2 |
| VS-023 | Review moderation in admin | P1 |

### Epic S5 — Fulfillment loop
| ID | Title | Priority |
|----|-------|----------|
| VS-024 | Admin shipment → shopping tracking timeline | P0 |
| VS-025 | Order status machine (pending→delivered/return) | P0 |
| VS-026 | Customer notifications (email/SMS templates) | P1 |

### Epic S6 — Harden & UAT
| ID | Title | Priority |
|----|-------|----------|
| VS-027 | Tax rules applied in shopping checkout | P1 |
| VS-028 | Full UAT: publish→buy→fulfill→track→review | P0 |

---

## 5. Backend endpoints (shopping) — already implemented contract

Base: `http://localhost:8001/api/v1`

Auth, customers, addresses, categories, products (+ filters/merchandising), cart, wishlist, compare, coupons, checkout, payments, orders, reviews — see `docs/api/api-documentation.md`.

Admin remains on `:8000` for catalog write, inventory, orders ops, shipments, reports.

---

## 6. Frontend theme plan (BlueBerry)

Keep visual system; replace data sources:

| Template area | Source of truth |
|---|---|
| Hero / campaign banners | Phase 2 CMS (until then curated static + featured API) |
| Category chips | `GET /categories` |
| Product grids / tabs | `GET /products/*` |
| PDP | `GET /products/slug/{slug}` |
| Cart / wishlist / compare | Redux + shopping APIs |
| Checkout | Cart + checkout APIs |
| Track order | Orders tracking APIs |
| Login / register | Auth APIs |

---

## 7. Definition of Done (per story)

1. Story in Excel (`VS-*`) with acceptance criteria  
2. Feature branch `feat/vs-xxx-...`  
3. Backend schema/service/route if needed + Alembic  
4. Shopping UI wired (loading / empty / error)  
5. Admin reflection verified where applicable  
6. Smoke test / UAT note  
7. Status → Done in tracker  

---

## 8. Recommended delivery sequence

| Sprint | Focus | Exit |
|--------|-------|------|
| S1 | VS-001…007 Catalog reflection + theme API wiring | Publish in admin → see on shop |
| S2 | VS-011…017 Auth, cart, checkout, payment | Place order on shop |
| S3 | VS-018…020, 024…025 Admin order + fulfill loop | Order in admin; track updates |
| S4 | VS-008…010, 013, 021…023, 026…027 Polish | Brands, reviews, tax, notify |
| S5 | VS-028 Full UAT + cutover notes | Client sign-off |

---

## 9. Related docs

- `docs/PROJECT_TRACKING.xlsx` — Stories, Timeline, Workflows, Git Branches  
- `docs/UAT_CHECKLIST_SHOPPING.md` — Shopping-first UAT  
- `docs/architecture/system-architecture.md`  
- `docs/api/api-documentation.md`  
