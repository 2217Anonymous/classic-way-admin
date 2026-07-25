# Valaiyagam E-Commerce — Architecture & Delivery Timeline

**Document purpose:** Client-ready overview of the complete e-commerce platform architecture, delivery phases, integrations (payment, courier, tracking), and UI standards.  
**Product:** Valaiyagam Commerce Admin + Storefront  
**Date:** 19 July 2026  
**Status:** Phase 1 foundation delivered (Auth, Users, Roles, Docker, MySQL, Alembic)

---

## 1. Executive Summary

Valaiyagam is a full e-commerce platform with:

| Layer | Purpose |
|---|---|
| **Admin Panel** | Product, order, user, role, inventory, courier, payment, and tracking control |
| **Customer Storefront** | Browse, cart, checkout, pay, track orders |
| **API Backend** | FastAPI layered services with MySQL |
| **Integrations** | Payment gateways, courier partners, shipment tracking |
| **Ops** | Docker, Alembic migrations, Git feature-branch workflow |

**Current foundation (done):** JWT auth, RBAC users/roles, light glass admin UI, Docker Compose (MySQL + API + Frontend), Alembic migrations.

---

## 2. System Architecture

### 2.1 High-Level Diagram

```text
┌─────────────────┐     ┌─────────────────┐
│  Admin Panel    │     │  Storefront     │
│  Next.js +      │     │  Next.js +      │
│  Tailwind +     │     │  Tailwind       │
│  Redux Toolkit  │     │  Redux Toolkit  │
└────────┬────────┘     └────────┬────────┘
         │  HTTPS/REST           │
         └───────────┬───────────┘
                     ▼
         ┌───────────────────────┐
         │   FastAPI API Layer   │
         │   /api/v1/...         │
         │   Auth · RBAC · CRUD  │
         └───────────┬───────────┘
                     │
     ┌───────────────┼───────────────┐
     ▼               ▼               ▼
┌─────────┐   ┌────────────┐   ┌────────────┐
│ MySQL   │   │ Payment    │   │ Courier &  │
│ Primary │   │ Gateway    │   │ Tracking   │
│ DB      │   │ (Razorpay/ │   │ APIs       │
│         │   │  Stripe)   │   │            │
└─────────┘   └────────────┘   └────────────┘
```

### 2.2 Backend Layered Structure (FastAPI)

```text
backend/app/
├── api/             Routes + auth dependencies
├── schemas/         Request/response contracts (Pydantic)
├── services/        Business rules
├── repositories/    Database access
├── models/          SQLAlchemy tables
├── constants/       Roles, statuses, enums
├── core/            Config, security, DB, bootstrap
├── utils/           Helpers, errors
└── main.py          Application entry
```

**Rule:** Route → Service → Repository → Model. No business logic inside routes.

### 2.3 Frontend Structure

```text
frontend/src/
├── app/             Next.js App Router pages
├── components/      UI (glass panels, modals, tables)
├── store/           Redux slices (auth, users, roles, …)
└── lib/             API client + shared types
```

### 2.4 Infrastructure

| Component | Technology |
|---|---|
| Frontend | React 19, Next.js 16, Tailwind CSS 4, Redux Toolkit |
| Backend | FastAPI, SQLAlchemy 2, Pydantic Settings, JWT, Argon2 |
| Database | MySQL 8.4 |
| Migrations | Alembic |
| Containers | Docker + Docker Compose (`valaiyagam-network`) |
| Secrets | `.env` / pydantic-settings |

---

## 3. Domain Modules (Complete Platform)

| # | Module | Description | Status |
|---|---|---|---|
| 1 | Authentication & RBAC | Login, JWT, admin/manager/viewer roles | **Done** |
| 2 | User Management | CRUD, activation, role assignment | **Done** |
| 3 | Role Management | CRUD with protected system roles | **Done** |
| 4 | Catalog | Categories, products, variants, media | Planned |
| 5 | Inventory | Stock, warehouses, low-stock alerts | Planned |
| 6 | Cart & Checkout | Guest/auth cart, address, shipping quote | Planned |
| 7 | Orders | Create, confirm, cancel, refund workflow | Planned |
| 8 | Payments | Gateway + webhooks + reconciliation | Planned |
| 9 | Couriers | Partner APIs, AWB, label, pickup | Planned |
| 10 | Tracking | Shipment timeline for admin + customer | Planned |
| 11 | Notifications | Email/SMS/WhatsApp order events | Planned |
| 12 | Reports | Sales, fulfillment, payment settlement | Planned |
| 13 | CMS / Banners | Homepage content management | Planned |
| 14 | Settings | Tax, shipping zones, store config | Planned |

---

## 4. Payment Integration Architecture

### 4.1 Goals
- Collect payments securely (cards, UPI, wallets, netbanking as supported by gateway).
- Never store full card data in Valaiyagam databases.
- Reconcile gateway status with order payment status via webhooks.

### 4.2 Recommended Flow

```text
1. Customer places order → Order = PENDING_PAYMENT
2. Backend creates Payment Intent / Order with gateway
3. Customer completes payment on gateway UI / SDK
4. Gateway sends webhook → Backend verifies signature
5. On success → Order = PAID → Inventory reserved → Courier eligible
6. On failure/timeout → Order = PAYMENT_FAILED (retry allowed)
```

### 4.3 Suggested Providers (India-first)
| Provider | Use case |
|---|---|
| Razorpay | Primary (UPI + cards + wallets) |
| Stripe | International / cards (optional) |
| COD | Cash on delivery with courier confirmation |

### 4.4 Key Tables (planned)
- `payments` — amount, currency, gateway, status, reference ids  
- `payment_events` — webhook audit log  
- `refunds` — partial/full refunds linked to order

### 4.5 Security Rules
- HMAC/signature verification on every webhook  
- Idempotent webhook handling  
- Admin-only refund actions  
- PCI scope minimized (hosted checkout / SDK)

---

## 5. Courier Integration Architecture

### 5.1 Goals
- Create shipment after payment confirmation (or COD approval).
- Generate AWB / tracking number.
- Book pickup, print label, cancel/reassign shipment.
- Support multiple courier partners behind one adapter interface.

### 5.2 Adapter Pattern

```text
CourierService
  ├── DelhiveryAdapter
  ├── ShiprocketAdapter
  ├── BlueDartAdapter
  └── ManualCourierAdapter (fallback)
```

All adapters implement: `create_shipment`, `cancel_shipment`, `get_tracking`, `generate_label`.

### 5.3 Flow

```text
PAID Order → Validate address & weight → Select courier rule
→ Create shipment API → Save AWB → Print label → Schedule pickup
→ Status sync via webhook/poll → Delivered / RTO / Exception
```

### 5.4 Key Tables (planned)
- `shipments` — order_id, courier, awb, status, label_url  
- `shipment_events` — tracking checkpoints  
- `courier_accounts` — credentials, serviceability zones

---

## 6. Order Tracking System

### 6.1 Customer Experience
- Track by Order ID + phone/email OTP (or logged-in account).
- Timeline UI: Placed → Paid → Packed → Shipped → Out for delivery → Delivered.

### 6.2 Admin Experience
- Order detail page with payment + shipment timeline.
- Manual status override (with audit log).
- Exception queue (address issue, RTO, lost package).

### 6.3 Event Sources
| Source | Events |
|---|---|
| Internal order service | created, paid, packed, cancelled |
| Payment gateway | authorized, captured, failed, refunded |
| Courier API / webhook | picked, in-transit, out-for-delivery, delivered, RTO |

### 6.4 Notification Triggers
- Order confirmed, payment success/failure  
- Shipped (with AWB + courier link)  
- Out for delivery / delivered  
- Refund processed

---

## 7. UI / UX Standards (Client Explanation)

### 7.1 Visual Direction
- **Theme:** Light, airy, glassmorphism (not dark).
- **Surfaces:** Soft white / translucent panels, blur, subtle borders.
- **Accent:** Teal → cyan gradient for primary actions.
- **Background:** Soft `#f5f8fc` with gentle color blurs.

### 7.2 Layout Rules
- One clear job per screen/section.
- Desktop: left glass sidebar + content.
- Mobile: sticky bottom nav + card lists (not cramped tables).
- Modals for create/edit; confirmation dialogs for destructive actions.
- No browser `confirm()` / `alert()` — custom modal only.

### 7.3 Interaction Standards
| Action | Pattern |
|---|---|
| Create / Edit | Glass modal form |
| Delete | Confirm dialog with clear consequence text |
| Status change | Explicit control inside edit form |
| Empty state | Friendly message + CTA |
| Errors | Inline red banner from API `detail` |

### 7.4 Accessibility & Responsiveness
- Touch targets ≥ 44px on mobile  
- Keyboard Esc closes modals  
- Readable contrast on glass surfaces  
- Tables on desktop → cards on mobile

---

## 8. Security & Compliance Baseline

- JWT access tokens; password hashing with Argon2  
- Role-based endpoint guards (admin / manager / viewer)  
- Secrets only via environment variables  
- HTTPS in production  
- Webhook signature verification  
- Audit logs for refunds, role changes, manual shipment overrides  
- GDPR/DPDP-ready data deletion plan for customer PII

---

## 9. Delivery Timeline (Recommended)

**Total planned duration:** ~16 weeks (4 months) for MVP store + admin, assuming 1–2 backend + 1–2 frontend engineers.

| Phase | Weeks | Deliverables | Exit Criteria |
|---|---|---|---|
| **P0 — Foundation** | W1–W2 | Auth, users, roles, Docker, Alembic, UI shell | Admin login + RBAC CRUD live |
| **P1 — Catalog** | W3–W5 | Categories, products, media, inventory basics | Admin can publish products |
| **P2 — Orders** | W6–W8 | Cart, checkout, order lifecycle, addresses | End-to-end unpaid order works |
| **P3 — Payments** | W9–W10 | Gateway, webhooks, refunds, COD | Paid order path verified |
| **P4 — Courier** | W11–W12 | Partner adapter, AWB, labels, pickup | Shipment created from paid order |
| **P5 — Tracking & Notify** | W13–W14 | Timeline UI, webhooks, email/SMS | Customer can track order |
| **P6 — Harden & Launch** | W15–W16 | Reports, UAT, performance, go-live checklist | Production cutover |

### Milestone Checkpoints
1. **M1 (End W2):** Foundation demo — *DONE*  
2. **M2 (End W5):** Catalog demo  
3. **M3 (End W8):** Checkout demo  
4. **M4 (End W10):** Payment demo  
5. **M5 (End W12):** Courier demo  
6. **M6 (End W14):** Tracking demo  
7. **M7 (End W16):** Go-live readiness

---

## 10. Git & Delivery Workflow

| Item | Convention |
|---|---|
| Main branch | `main` (production-ready) |
| Develop | `develop` (integration) |
| Feature branches | `feat/<module>-<short-title>` |
| Bugfix | `fix/<ticket-id>-<short-title>` |
| Hotfix | `hotfix/<short-title>` |
| PR required | Yes — review + CI green |
| Story tracking | Excel workbook `docs/PROJECT_TRACKING.xlsx` |

Example: `feat/payments-razorpay-webhook`

---

## 11. Environments

| Env | Purpose | URL pattern |
|---|---|---|
| Local / Docker | Dev | localhost:3000 / :8000 |
| Staging | Client UAT | staging.valaiyagam.example |
| Production | Live | admin / shop domains |

---

## 12. Risks & Assumptions

| Risk | Mitigation |
|---|---|
| Courier API delays / downtime | Multi-courier adapter + manual fallback |
| Payment webhook misses | Reconciliation job + admin retry |
| Scope creep | Freeze MVP modules before P3 |
| Mobile UX complexity | Card-first mobile patterns from day one |
| Data migration later | Alembic from start (already in place) |

**Assumptions:** Client provides merchant gateway keys, courier account credentials, brand assets, and tax/shipping rules before P3/P4.

---

## 13. What Exists Today vs Next

### Done now
- Layered FastAPI backend  
- Next.js light-glass admin UI  
- User & role CRUD with edit + confirm delete  
- MySQL schema + Alembic  
- Docker Compose network

### Immediate next (P1)
- Product & category modules  
- Media upload  
- Inventory fields  
- Admin navigation expansion

---

## 14. Related Client Materials

| File | Use |
|---|---|
| `docs/ECOM_ARCHITECTURE_AND_TIMELINE.md` | This architecture & timeline brief |
| `docs/Valaiyagam_Client_Presentation.pptx` | Client PPT (UI + integrations) |
| `docs/PROJECT_TRACKING.xlsx` | Story / branch / date tracking workbook |

---

*Prepared for client presentation and project governance — Valaiyagam E-Commerce.*
