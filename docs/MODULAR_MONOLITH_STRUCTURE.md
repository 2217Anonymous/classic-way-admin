# Valaiyagam Modular Monolith Structure

## Decision

The backend remains one FastAPI process and one deployable Docker image. It is
split internally by business domain so a module can later become a microservice
without rewriting its business logic.

The domain structure exists under `backend/app/modules/`. Authentication and
user management have been migrated to Identity; roles and authorization have
been migrated to IAM. Existing API paths remain unchanged.

## Previous structure

```text
app/
├── api/             Mixed auth, users, roles routes
├── models/          Mixed user and role models
├── schemas/         Mixed auth, user, role schemas
├── repositories/    User and role persistence
├── services/        Auth, user, role use cases
├── core/            Config, DB, security
└── utils/           Errors
```

This was layered, but not modular: one domain was spread across several
top-level technical folders. These duplicate user/role files are now removed.

## Target structure

```text
app/
├── main.py                  Composition root only
├── modules/
│   ├── identity/
│   │   ├── api/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── models/
│   │   ├── providers/
│   │   └── events/
│   ├── iam/
│   ├── catalog/
│   ├── orders/
│   ├── payments/
│   ├── fulfillment/
│   ├── notifications/
│   ├── reporting/
│   └── settings/
└── shared/
    ├── config/
    ├── database/
    ├── security/
    ├── logging/
    ├── events/
    ├── observability/
    └── errors/
```

Each module creates only the subfolders it currently needs. The README in every
module defines ownership and contracts.

## Module ownership

| Module | Owns | Does not own |
|---|---|---|
| Identity | Users, password credentials, SSO identities, sessions | Roles and permission policies |
| IAM | Roles, permissions, assignments, authorization | Passwords and SSO |
| Catalog | Products, categories, variants, media, inventory | Carts and order lines |
| Orders | Cart, checkout, order lifecycle, order snapshots | Gateway payments and courier API |
| Payments | Payment attempts, webhooks, refunds | Order state machine |
| Fulfillment | Courier adapters, shipments, AWB, tracking | Payment capture |
| Notifications | Templates and message delivery | Changing business state |
| Reporting | Read projections and exports | Transactional writes |
| Settings | Store, tax, shipping-zone configuration | Provider secrets in plaintext |

## Allowed dependency direction

```text
main (composition)
  └── modules
       ├── own internal layers
       ├── other modules' public interfaces only
       └── shared infrastructure
```

Forbidden:

```text
orders.repository → payments.models
payments.service  → orders.repository
catalog.api       → fulfillment.database tables
shared            → any business module
```

Preferred:

```text
orders.service → payments public service interface
payment.succeeded event → orders event handler
```

## Migration progress

### Step 1 — Identity and IAM (completed)

Files were moved while preserving existing endpoints:

| Current | Target |
|---|---|
| `api/routes/auth.py` | `modules/identity/api/auth.py` |
| `services/auth_service.py` | `modules/identity/services/password_auth.py` |
| User account route/service/repository | `modules/identity/...` |
| Role route/service/repository | `modules/iam/...` |
| User model | `modules/identity/models/user.py` |
| Role and user-role models | `modules/iam/models/role.py` |
| Auth dependency | Identity authentication + IAM authorization dependencies |

The user-role relationship is split across domain model files. Identity calls
`IamService` from `modules/iam/public.py`, not the IAM repository directly.

### Step 2 — Shared infrastructure

Move configuration, database, JWT/password primitives, errors, and correlation
logging into `app/shared`.

### Step 3 — Catalog

Implement the first new business feature directly in the target structure. Do
not add product code to the old top-level folders.

### Step 4 — Orders, Payments, Fulfillment

Add each domain in sequence. Use an outbox-backed event interface for payment
and shipment side effects.

### Step 5 — Remove old technical files (completed for Identity/IAM)

Duplicate top-level auth, user, role, model, schema, repository, service,
constant, and route files were deleted after composition imports were updated.
The remaining `core` and `utils` files move during the shared-infrastructure
step.

## Module public API pattern

Each implemented module should expose a small facade:

```python
# app/modules/payments/public.py
class PaymentGateway:
    def create_payment(self, order_reference: str, amount: Decimal): ...
    def get_status(self, order_reference: str): ...
```

Consumers import `payments.public`, never `payments.repositories` or
`payments.models`.

## Database strategy

During modular-monolith phase:

- One MySQL database and one Alembic migration history.
- Tables have one explicit owning module.
- No cross-module repository access.
- Foreign keys may be used when transaction consistency is valuable.
- Domain events are written through an outbox for external side effects.

When extracting a microservice:

1. Copy the owning module and its tables.
2. Replace direct public interface calls with API/event contracts.
3. Migrate data ownership.
4. Remove cross-service database foreign keys.

## Verification gate for every module move

- Existing API paths remain compatible.
- Unit tests cover service rules.
- Integration tests cover repositories.
- Alembic reaches `head`.
- Docker stack starts.
- Auth and RBAC smoke tests pass.
- No forbidden cross-module imports.

## Next implementation

The safest next code change is Identity + IAM migration together with SSO:

1. Add sessions, refresh tokens, and SSO identity models.
2. Build common token service.
3. Move password auth into Identity.
4. Move roles and authorization into IAM.
5. Register new routers from `main.py`.
6. Keep compatibility aliases until frontend migration is complete.
