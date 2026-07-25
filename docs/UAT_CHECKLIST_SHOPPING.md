# UAT Checklist — Shopping ↔ Admin Sync (VS-028)

**Apps:** Admin http://localhost:3000 · Shopping http://localhost:3001  
**APIs:** Admin http://localhost:8000/docs · Shopping http://localhost:8001/docs  
**Date:** __________ · **Tester:** __________ · **Build:** __________

Admin and shopping use PostgreSQL only (no mock data mode).

---

## Pre-checks

| # | Step | Pass |
|---|------|------|
| 0.1 | `docker compose up` healthy (postgres, both APIs, both UIs) | ☐ |
| 0.2 | Admin login works | ☐ |
| 0.3 | Shopping home loads (theme) | ☐ |
| 0.4 | Fashion seed loaded (optional) | ☐ |

---

## WF-A — Publish product → Shopping

| # | Step | Pass | Notes |
|---|------|------|-------|
| A1 | Admin: create category (e.g. T-Shirts) | ☐ | |
| A2 | Admin: create product with images + size/color variants | ☐ | |
| A3 | Admin: set published + public + stock | ☐ | |
| A4 | Shopping: product appears in shop listing | ☐ | |
| A5 | Shopping: PDP shows images, price, variants | ☐ | |
| A6 | Admin: unpublish → shopping hides product | ☐ | |

---

## WF-B — Place order → Admin

| # | Step | Pass | Notes |
|---|------|------|-------|
| B1 | Shopping: register/login customer | ☐ | |
| B2 | Add variant to cart | ☐ | |
| B3 | Apply coupon (if configured) | ☐ | |
| B4 | Checkout with address + COD (or Razorpay) | ☐ | |
| B5 | Note `order_number` | ☐ | |
| B6 | Admin → Orders: order visible with same number | ☐ | |
| B7 | Admin → Inventory: stock reserved/updated | ☐ | |

---

## WF-C — Fulfill → Track

| # | Step | Pass | Notes |
|---|------|------|-------|
| C1 | Admin: mark order paid (COD) | ☐ | |
| C2 | Admin: create shipment + AWB | ☐ | |
| C3 | Admin: add shipment events | ☐ | |
| C4 | Shopping: Track Order shows updated timeline | ☐ | |

---

## WF-D / E / F — Change, coupon, review

| # | Step | Pass | Notes |
|---|------|------|-------|
| D1 | Admin edits price → shopping refresh shows new price | ☐ | |
| E1 | Admin coupon used on shopping → discount on order | ☐ | |
| F1 | Customer submits review (after delivered) | ☐ | |
| F2 | Admin approves → review on PDP (when VS-023 done) | ☐ | |

---

## Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| QA | | | |
| Client | | | |

**Defects:** log against story IDs (VS-*/VL-*) in `PROJECT_TRACKING.xlsx`.
