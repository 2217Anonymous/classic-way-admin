# Valaiyagam — SSO + Password Auth, Logging & Microservice Architecture

**Date:** 19 July 2026  
**Purpose:** Client/tech architecture for dual login (SSO + password), centralized log management, and a practical microservice split plan.  
**Current state:** Modular FastAPI monolith with local email/password + JWT + RBAC.

---

## 1. Executive recommendation

| Topic | Recommendation |
|---|---|
| Login methods | Support **both**: local password **and** SSO (OIDC) |
| Identity approach | Introduce a dedicated **Identity Service** (even if hosted inside monolith first) |
| SSO standard | **OpenID Connect (OIDC)** over OAuth2 (Google / Microsoft Entra / Keycloak) |
| Logging | Centralized logs + audit trail + correlation IDs (ELK or Loki stack) |
| Microservices | Do **not** split into 15+ services now. Target **6–8** services, start as **modular monolith → extract by domain** |
| Best near-term path | Keep one deployable backend, carve clear module boundaries, extract Identity + Payments first |

**Why both SSO and password?**
- SSO for company staff / enterprise customers (secure, less password fatigue)
- Password for local admins, break-glass access, vendors without SSO, and development/staging

---

## 2. Dual authentication architecture (SSO + Password)

### 2.1 High-level flow

```text
                         ┌─────────────────────────┐
                         │      Admin / Store UI   │
                         │  [SSO Login] [Password] │
                         └────────────┬────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │     API Gateway         │
                         │  /auth/login            │
                         │  /auth/sso/start        │
                         │  /auth/sso/callback     │
                         │  /auth/refresh          │
                         │  /auth/logout           │
                         └────────────┬────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │    Identity Service     │
                         │  - Password verifier    │
                         │  - OIDC client          │
                         │  - User account link    │
                         │  - Token issuer         │
                         │  - Session / revoke     │
                         └───────┬─────────┬───────┘
                                 │         │
                    ┌────────────┘         └────────────┐
                    ▼                                   ▼
           Local credential store                 External IdP
           (Argon2 hashes)                        (Google/Entra/Keycloak)
```

### 2.2 Login modes

#### A) Password login (keep + harden)
1. User submits email + password  
2. Identity verifies Argon2 hash  
3. Issues **short-lived access token** + **refresh token**  
4. Applies rate-limit / lockout / MFA (optional for admin)

#### B) SSO login (OIDC Authorization Code + PKCE)
1. UI calls `GET /auth/sso/start?provider=google|entra|keycloak`  
2. Backend creates auth request (state + PKCE `code_verifier`)  
3. User authenticates at Identity Provider (IdP)  
4. IdP redirects to `/auth/sso/callback` with `code`  
5. Backend exchanges code for IdP tokens, validates ID token (`iss`, `aud`, `exp`, signature)  
6. Backend finds or links local user by verified email (`sub` + provider)  
7. Backend issues **Valaiyagam tokens** (same format for both login types)

> Important: Frontend and other microservices should trust **only Valaiyagam-issued tokens**, not raw Google/Microsoft tokens.

### 2.3 Account linking model

```text
users
  id, email, full_name, is_active, auth_methods...

user_credentials          (password users only)
  user_id, password_hash, password_updated_at

sso_identities             (SSO users)
  user_id, provider, provider_subject, email, linked_at

refresh_tokens / sessions
  id, user_id, token_hash, expires_at, revoked_at, ip, user_agent
```

Rules:
- One user can have **password + one/more SSO providers** linked
- First SSO login with a known email can auto-link (policy-controlled) or require admin approval
- Disable password login per user if org mandates SSO-only
- Keep at least one **break-glass local admin** password account (offline IdP failure)

### 2.4 Token strategy (common for both methods)

| Token | Lifetime | Storage | Purpose |
|---|---|---|---|
| Access JWT | 5–15 min | Memory / short cookie | API authorization |
| Refresh token | 7–30 days | HttpOnly Secure SameSite cookie (preferred) | Renew access |
| Revocation list | Until expiry | Redis / DB | Logout / force sign-out |

Access token claims (example):
```json
{
  "sub": "42",
  "email": "admin@valaiyagam.com",
  "roles": ["admin"],
  "amr": ["pwd"] ,
  "sid": "session-uuid",
  "type": "access",
  "exp": 1710000000
}
```
- `amr`: authentication methods (`pwd`, `sso`, `mfa`)
- `sid`: session id for revoke/audit

### 2.5 Recommended providers

| Environment | Provider | Why |
|---|---|---|
| Enterprise client SSO | Microsoft Entra ID (Azure AD) | Common for company staff |
| Consumer / quick social | Google OIDC | Easy onboarding |
| Self-hosted / full control | Keycloak | No vendor lock-in, realm management |
| Dev/local | Keycloak in Docker | Same OIDC flow as production |

---

## 3. Identity module restructure (inside current backend first)

Even before microservices, restructure current FastAPI into clear identity boundaries:

```text
backend/app/
├── identity/
│   ├── api/                # login, sso start/callback, refresh, logout, me
│   ├── services/
│   │   ├── password_auth.py
│   │   ├── sso_oidc.py
│   │   ├── token_service.py
│   │   └── account_link_service.py
│   ├── providers/          # google.py, entra.py, keycloak.py
│   ├── models/             # UserCredential, SsoIdentity, Session
│   ├── schemas/
│   └── repositories/
├── iam/                    # roles, permissions, policy checks
├── catalog/
├── orders/
├── payments/
├── fulfillment/            # courier + tracking
├── notifications/
└── shared/                 # config, logging, db, errors
```

**Migration path:**
1. Keep current password auth working  
2. Add SSO routes + identity tables  
3. Issue common tokens from `token_service`  
4. Later extract `identity/` as `identity-service`

---

## 4. Complementary log management architecture

Logging must cover **application logs**, **audit logs**, and **integration logs** (payment/courier webhooks).

### 4.1 Three log planes

| Plane | What it stores | Who uses it | Retention |
|---|---|---|---|
| **Application logs** | Request errors, stack traces, service events | Developers / DevOps | 15–30 days hot |
| **Audit logs** | Who did what (login, role change, refund, shipment override) | Security / compliance / client | 1–3 years |
| **Integration logs** | Webhook payloads (redacted), retries, signature failures | Support / payments ops | 90–180 days |

### 4.2 Target logging architecture

```text
Services / Gateway
   │  (JSON logs + correlation_id + user_id + trace_id)
   ▼
Log shipper (Fluent Bit / Vector)
   │
   ├──────────────► Loki or Elasticsearch  → Grafana / Kibana (search)
   │
   ├──────────────► Audit DB table / immutable store (compliance)
   │
   └──────────────► Alerts (login spikes, webhook signature failures)
```

### 4.3 Mandatory fields on every log line

```json
{
  "timestamp": "2026-07-19T15:22:11Z",
  "level": "INFO",
  "service": "identity-service",
  "env": "staging",
  "correlation_id": "c9f1...",
  "trace_id": "4bf9...",
  "user_id": "42",
  "session_id": "sid-...",
  "action": "auth.login.success",
  "auth_method": "sso",
  "provider": "entra",
  "ip": "1.2.3.4",
  "message": "User logged in"
}
```

### 4.4 What to audit (minimum)

- Login success/failure (password + SSO)
- Logout / token revoke
- Role/permission changes
- Password reset / credential link/unlink
- Payment capture/refund
- Shipment create/cancel/manual override
- Admin user create/disable

### 4.5 Security rules for logs
- Never log raw passwords, tokens, card data, or full secrets  
- Mask phone/email partially in application logs  
- Keep full actor identity in **audit** logs (protected access)  
- Use correlation IDs across UI → API → payment/courier calls  

### 4.6 Suggested stack (cost-aware)

| Scale | Stack |
|---|---|
| Early / staging | Loki + Grafana + Tempo (traces) |
| Growth | ELK (Elasticsearch + Kibana) or OpenSearch |
| Cloud managed | AWS CloudWatch + OpenSearch, or Datadog/New Relic |

---

## 5. Microservice split — how many and how

### 5.1 Principle

Split by **business capability**, not by technical layer.  
Avoid “nano-services”. For Valaiyagam MVP → growth, **6–8 services** is the sweet spot.

### 5.2 Recommended target services (7 + gateway)

```text
1. api-gateway          # auth forwarding, routing, rate-limit, TLS termination helper
2. identity-service     # SSO + password + sessions + user profile basics
3. catalog-service      # categories, products, media, inventory read/write
4. order-service        # cart, checkout, order lifecycle
5. payment-service      # gateway intents, webhooks, refunds, reconciliation
6. fulfillment-service  # courier adapters, AWB, tracking timeline
7. notification-service # email/SMS/WhatsApp
8. admin-bff (optional) # aggregates admin screens to reduce chatty UI calls
```

That’s **7 core services** (or 8 with Admin BFF).  
Plus MySQL (or DB-per-service), Redis, and object storage.

### 5.3 Why this split (and not more)

| Service | Why separate | Why not merge |
|---|---|---|
| Identity | Different security/compliance lifecycle; SSO complexity | Should not be mixed with catalog deploy risk |
| Catalog | High read traffic; independent scaling | Different from transactional orders |
| Order | Core transactional consistency | Needs clear ownership of order state machine |
| Payment | PCI-sensitive boundaries + webhook reliability | Must isolate secrets and retries |
| Fulfillment | Partner API instability; retry/queue heavy | Failures should not block checkout |
| Notification | Async, noisy, provider-specific | Easy to scale independently |

### 5.4 What NOT to split early

- Do **not** create separate services for: roles, permissions, address book, coupons, small CMS, reports (start inside nearest domain or admin-bff)
- Do **not** split “user-service” and “auth-service” until team is larger — keep both in **identity-service**
- Do **not** create one service per courier partner — use adapters inside fulfillment-service

### 5.5 Phased extraction plan (recommended)

#### Phase 0 — Now (modular monolith)
- One FastAPI app, folders by domain (`identity`, `catalog`, `orders`...)
- Shared DB, clear module APIs
- Add structured logging + correlation IDs

#### Phase 1 — Extract Identity (first microservice)
- SSO + password + sessions move out
- Other modules validate JWT via JWKS/public key
- Biggest security payoff

#### Phase 2 — Extract Payment
- Before production money movement
- Own DB tables + webhook endpoint + outbox

#### Phase 3 — Extract Fulfillment
- Courier + tracking
- Queue-based status sync

#### Phase 4 — Extract Catalog / Order if scale requires
- Split when team/load justifies independent deploy

### 5.6 Communication patterns

| Path | Pattern |
|---|---|
| UI → services | HTTPS via API Gateway |
| Sync queries | REST/gRPC between services (minimal) |
| Business events | Domain events on queue/bus (`order.paid`, `shipment.created`) |
| Reliability | Outbox pattern for payment/fulfillment events |

Example event chain:
```text
order-service: order.placed
payment-service: payment.succeeded → event order.paid
fulfillment-service: listens order.paid → creates shipment
notification-service: listens shipment.created → SMS/email
```

### 5.7 Data ownership (avoid shared DB spaghetti)

| Service | Owns data |
|---|---|
| identity | users, credentials, sso_identities, sessions, roles |
| catalog | categories, products, media, stock |
| order | carts, orders, order_items, addresses |
| payment | payments, refunds, payment_events |
| fulfillment | shipments, shipment_events, courier_accounts |
| notification | templates, delivery attempts |

Services may **read** limited shared projections (e.g., order-service stores `customer_email` snapshot), but not write another service’s tables.

---

## 6. Target architecture diagram

```text
                     [Admin Web]     [Storefront]
                           \           /
                            \         /
                           [API Gateway]
                      rate-limit | JWT check | routing
                                |
        -------------------------------------------------
        |        |         |          |         |       |
   Identity   Catalog   Order     Payment  Fulfillment  Notify
   (SSO+PWD)  products  cart/     webhooks  courier     email
              stock     orders              tracking    SMS
        -------------------------------------------------
                                |
                     Event Bus / Queue (Redis streams / Rabbit / Kafka)
                                |
                     Observability: Loki/ELK + Grafana + Tempo
```

---

## 7. How SSO + password fits microservice world

1. User logs in via Gateway → Identity Service (password or SSO)  
2. Identity returns Valaiyagam access/refresh tokens  
3. UI calls Order/Catalog/etc with Bearer token  
4. Gateway or each service validates JWT signature (public key/JWKS from Identity)  
5. Authorization decisions use roles/permissions claims (or Identity introspection for high-risk actions)  
6. Every request carries `X-Correlation-Id` for log stitching  

---

## 8. Implementation backlog (practical)

### Sprint-sized identity work
1. Restructure `identity` module boundaries in current backend  
2. Add `sso_identities` + `sessions` tables (Alembic)  
3. Implement password login → access/refresh tokens  
4. Implement OIDC start/callback for one provider (Keycloak first)  
5. Account linking by verified email  
6. Logout/revoke + refresh rotation  
7. Admin policy: SSO-only vs hybrid per user/org  
8. Structured JSON logging + audit events for auth  

### Logging work
1. Adopt JSON logger utility with correlation middleware  
2. Create `audit_logs` table (append-only)  
3. Ship container logs to Loki/Elastic  
4. Dashboards: failed logins, webhook failures, 5xx rates  

### Microservice readiness work
1. Define module APIs and event contracts  
2. Introduce outbox table for domain events  
3. Extract identity-service when SSO is stable  
4. Extract payment-service before real money  

---

## 9. Decision matrix for the client

| Decision | Choice | Reason |
|---|---|---|
| SSO protocol | OIDC | Standard, safer than custom SAML-first for web apps |
| First IdP | Keycloak (dev) + Entra/Google (prod as needed) | Portable design |
| Keep password? | Yes (hybrid) | Break-glass + non-SSO users |
| Token style | Internal JWT from Identity | Stable across providers |
| Microservice count | **7 core** (+ optional BFF) | Balance of scale vs complexity |
| When to split | Identity first, then Payment, then Fulfillment | Risk-driven extraction |
| Logging | App + Audit + Integration planes | Complements security and ops |

---

## 10. What we should not do

- Replace password completely on day one  
- Build 12–20 microservices with a small team  
- Trust frontend role checks as security  
- Log tokens/passwords/webhook secrets  
- Let every service talk to one shared mutable database forever  

---

## 11. Suggested next build step (engineering)

If approved, implement in current repo **without full microservice split yet**:

1. Identity module restructure  
2. Password + refresh token hardening  
3. SSO via Keycloak (Docker) using OIDC  
4. Audit log table + correlation IDs  
5. Keep catalog/orders in modular monolith until P1–P3  

This delivers SSO + password immediately, while staying aligned with the future 7-service architecture.

---

## Related docs
- `docs/SECURITY_ARCHITECTURE.md` — current controls & security roadmap  
- `docs/ECOM_ARCHITECTURE_AND_TIMELINE.md` — delivery timeline  
- `docs/PROJECT_TRACKING.xlsx` — add stories `VL-AUTH-*`, `VL-LOG-*`, `VL-SVC-*`

---

*Recommendation: Hybrid auth now, centralized logging now, microservices by extraction — Identity → Payment → Fulfillment — targeting about seven services, not a big-bang rewrite.*
