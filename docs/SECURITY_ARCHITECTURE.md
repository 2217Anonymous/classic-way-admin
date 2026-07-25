# Valaiyagam — Security Architecture Brief

**Audience:** Client / stakeholders  
**Date:** 19 July 2026  
**Purpose:** Explain current security controls and the recommended improvement roadmap for a production e-commerce platform (admin, payments, courier, tracking).

---

## 1. One-line summary

Today we have a **solid foundation** for an admin MVP (hashed passwords, JWT login, role-based access, env-based secrets, Docker isolation).  
For production e-commerce with payments and courier integrations, we should upgrade to a **defence-in-depth** model: short-lived tokens, refresh/revoke, rate limits, HTTPS-only, webhook signatures, audit logs, and least-privilege secrets.

---

## 2. What security we are using today

### 2.1 Authentication (who you are)

| Control | How it works today | Strength |
|---|---|---|
| Password hashing | **Argon2** via `pwdlib` (`PasswordHash.recommended()`) | Strong — industry recommended |
| Login API | OAuth2 password form → email + password | Standard for admin APIs |
| Session token | **JWT (HS256)** access token with expiry (`exp`) | Good baseline |
| Token claim check | Payload must include `type=access` and valid `sub` (user id) | Prevents simple token misuse |
| Inactive users | Login and API access blocked if `is_active=false` | Account disable works |
| Password rules | Minimum 8 characters on create/update | Basic only |

**Important:** Passwords are **never stored in plain text**. Only a hash is saved in MySQL (`hashed_password`).

### 2.2 Authorization (what you can do)

| Control | How it works today | Strength |
|---|---|---|
| RBAC roles | `admin`, `manager`, `viewer` seeded by default | Clear role model |
| Endpoint guards | FastAPI dependencies (`AdminUser`, `require_roles(...)`) | Enforced on server (not only UI) |
| Protected system roles | Default roles cannot be deleted | Prevents accidental lockout |
| Self-delete protection | Admin cannot delete own account | Safety rule |

Examples:
- Create/update/delete users → **admin only**
- List users → admin / manager / viewer
- Role write operations → **admin only**

### 2.3 Application & API hardening (current)

| Control | Status |
|---|---|
| CORS allow-list | Enabled (`CORS_ORIGINS`, default localhost:3000) |
| Secrets via environment | `.env` / pydantic-settings (not hardcoded in app logic for deploy) |
| Layered backend | Routes do not talk to DB directly — reduces accidental data leaks |
| Input validation | Pydantic schemas (email, length, role name pattern) |
| Error mapping | Custom `AppError` → controlled JSON `detail` responses |
| DB migrations | Alembic versioning (safer schema change process) |
| Container isolation | Frontend / backend / MySQL on Docker network |

### 2.4 Frontend security posture (current)

| Control | Status | Note |
|---|---|---|
| Bearer token on API calls | Yes | `Authorization: Bearer <token>` |
| Token storage | `localStorage` | Convenient, but XSS-sensitive (improvement needed) |
| UI role checks | Mostly UX | **Real security is backend RBAC** (correct approach) |
| Delete confirmations | Modal confirm | Prevents accidental destructive actions (UX safety) |

### 2.5 Security we intentionally do **not** handle yet (by design for later phases)

- Payment card data (should never touch our servers — gateway hosted checkout)
- Courier credential vaulting beyond env vars
- Customer PII encryption-at-rest policies
- WAF / DDoS edge protection
- Formal SOC2 / ISO27001 controls

---

## 3. Honest gaps (what needs improvement)

These are normal for an early foundation, but should be planned before go-live.

| Gap | Risk if ignored | Priority |
|---|---|---|
| Default/dev secrets in examples | Weak production secret if not rotated | **Critical** |
| Access token only (no refresh/revoke) | Stolen token valid until expiry (up to 60 min) | **High** |
| Token in `localStorage` | XSS can steal admin session | **High** |
| No login rate limiting / lockout | Brute-force password attempts | **High** |
| Weak password policy (length only) | Easy passwords accepted | **High** |
| No HTTPS enforcement docs for prod | Traffic interception risk | **High** |
| No audit log table | Hard to investigate who changed what | **Medium** |
| No security headers middleware | Browser-side hardening incomplete | **Medium** |
| No MFA for admin | Single password compromise = full admin | **Medium–High** |
| No webhook signature framework yet | Required when payments/courier go live | **High (before P3/P4)** |
| DB user likely over-privileged in early setup | Lateral movement if app compromised | **Medium** |

---

## 4. Target security architecture (recommended)

```text
                    ┌──────────────────────────────┐
                    │  CDN / WAF / TLS termination │
                    │  (Cloudflare / AWS / Nginx)  │
                    └──────────────┬───────────────┘
                                   │ HTTPS only
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
        Admin UI             Storefront            Webhooks
     (HttpOnly cookies)   (customer auth)     (signed payloads)
              │                    │                    │
              └────────────────────┼────────────────────┘
                                   ▼
                    ┌──────────────────────────────┐
                    │ FastAPI API Gateway layer    │
                    │ - Rate limit / IP throttle   │
                    │ - AuthN (JWT/session)        │
                    │ - AuthZ (RBAC + permissions) │
                    │ - Request validation         │
                    │ - Security headers           │
                    └──────────────┬───────────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          ▼                        ▼                        ▼
   App services              Secrets vault            Integration adapters
   (orders, users)           (AWS SM / Vault)         (payment, courier)
          │                                                 │
          ▼                                                 ▼
   MySQL (least privilege,                                  External providers
   encrypted connections,                                   (Razorpay, Shiprocket)
   backups encrypted)
```

### Design principles
1. **Least privilege** — every role, DB user, and API key gets only what it needs  
2. **Zero trust on inputs** — validate everything; never trust UI checks alone  
3. **Short-lived credentials** — access tokens expire quickly; refresh/revoke supported  
4. **Verify integrations** — every webhook must be signature-validated  
5. **Observable security** — audit logs + alerts for suspicious admin actions  
6. **No card data** — PCI scope stays with the payment provider

---

## 5. Improvement roadmap (phased)

### Phase A — Before staging UAT (immediate)

| Improvement | Why |
|---|---|
| Force strong unique `SECRET_KEY` in production | JWT integrity depends on it |
| Rotate default admin password on first login | Remove known bootstrap credential |
| Stronger password policy | Upper/lower/number/symbol + breached-password check (optional) |
| Login rate limit + temporary lockout | Stop brute force |
| Security headers | `HSTS`, `X-Content-Type-Options`, `Referrer-Policy`, CSP |
| HTTPS-only production config | Encrypt data in transit |
| Remove hardcoded demo credentials from login UI | Avoid accidental exposure in demos |

### Phase B — Before payment go-live (P3)

| Improvement | Why |
|---|---|
| Access + refresh token pair | Safer session lifetime |
| Token revoke / logout blacklist (Redis) | Kill stolen sessions |
| Move admin token to **HttpOnly Secure SameSite cookies** | Reduce XSS token theft |
| CSRF protection for cookie auth | Needed when cookies are used |
| Payment webhook HMAC verification | Prevent fake “paid” events |
| Idempotent payment event handling | Stop double capture/refund |
| Secrets manager for gateway keys | Avoid plain `.env` on servers |
| Admin MFA (TOTP/email OTP) | Protect high-privilege accounts |

### Phase C — Before courier & scale (P4–P6)

| Improvement | Why |
|---|---|
| Courier webhook signature + replay protection | Fake tracking updates |
| Fine-grained permissions (not only roles) | e.g. `payments.refund`, `shipments.create` |
| Audit log table for admin actions | Compliance + forensics |
| Field-level encryption for sensitive PII (optional) | Phone/address protection |
| DB TLS + restricted DB network access | Reduce data-store exposure |
| Automated dependency scanning (SCA) + container image scan | Catch known CVEs |
| Backup encryption + restore drills | Business continuity |
| WAF / bot protection on public endpoints | Checkout and login abuse |

---

## 6. Security model for upcoming integrations

### 6.1 Payments
- Use hosted checkout / SDK (Razorpay/Stripe).  
- **Never store PAN/CVV.**  
- Verify every webhook with provider signature.  
- Keep `payment_events` immutable audit trail.  
- Refunds only for privileged roles + MFA recommended.  
- Reconciliation job detects missed webhooks.

### 6.2 Courier
- Store partner API keys in secrets vault.  
- Adapter layer isolates credentials from business code.  
- Validate webhook timestamps (reject old/replayed events).  
- Manual shipment override requires reason + audit entry.

### 6.3 Tracking / customer portals
- Track page must require Order ID + OTP (or logged-in session).  
- Do not expose other customers’ addresses/phone in API responses.  
- Rate-limit tracking lookups to prevent enumeration.

---

## 7. Recommended RBAC evolution

**Now (role-based):**
- `admin` — full control  
- `manager` — operational read/manage  
- `viewer` — read-only  

**Later (permission-based matrix):**

| Permission | Admin | Manager | Viewer | Finance | Warehouse |
|---|---|---|---|---|---|
| users.manage | ✓ | | | | |
| products.manage | ✓ | ✓ | | | |
| orders.view | ✓ | ✓ | ✓ | ✓ | ✓ |
| payments.refund | ✓ | | | ✓ | |
| shipments.create | ✓ | ✓ | | | ✓ |
| reports.finance | ✓ | | | ✓ | |

This avoids giving “admin” for every operational task.

---

## 8. Client talking points (simple language)

1. **Passwords are hashed with Argon2** — even if DB is leaked, raw passwords are not readable.  
2. **Every sensitive API checks role on the server** — hiding a button in UI is not enough, and we don’t rely on that.  
3. **Tokens expire** — sessions are time-bounded.  
4. **Next upgrades** focus on stopping brute force, protecting admin sessions better, and securing payment/courier webhooks.  
5. **Card data never sits in Valaiyagam** — payment provider handles PCI-sensitive fields.  
6. **Security is phased with delivery** — foundation is in place; production-grade controls are mapped to payment and courier milestones.

---

## 9. Suggested acceptance checklist before production

- [ ] Production secrets rotated (JWT, DB, admin)  
- [ ] HTTPS + HSTS enabled  
- [ ] Login rate limiting active  
- [ ] Admin MFA enabled for all admin users  
- [ ] Refresh/revoke token flow tested  
- [ ] Payment webhook signature tests passing  
- [ ] Courier webhook signature tests passing  
- [ ] Audit log review process defined  
- [ ] Dependency + container vulnerability scan clean for critical issues  
- [ ] Backup restore tested  

---

## 10. Related documents

- `docs/ECOM_ARCHITECTURE_AND_TIMELINE.md` — overall architecture & timeline  
- `docs/Valaiyagam_Client_Presentation.pptx` — client presentation  
- `docs/PROJECT_TRACKING.xlsx` — implementation stories (security stories can be added as `VL-SEC-*`)

---

*This brief describes current controls accurately as of the foundation phase and proposes a practical path to production-grade e-commerce security.*
