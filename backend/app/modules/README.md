# Modular Monolith Domains

This directory is the target domain-oriented structure for the Valaiyagam
backend. The application remains one FastAPI deployment and one database while
each domain owns its API, schemas, services, repositories, and models.

```text
app/
├── modules/
│   ├── identity/       Password login, SSO, sessions, user accounts
│   ├── iam/            Roles, permissions, authorization policies
│   ├── catalog/        Categories, products, variants, media, stock
│   ├── orders/         Cart, checkout, addresses, order lifecycle
│   ├── payments/       Payment gateways, webhooks, refunds
│   ├── fulfillment/    Couriers, shipments, labels, tracking
│   ├── notifications/  Email, SMS, WhatsApp delivery
│   ├── reporting/      Read models, dashboards, exports
│   └── settings/       Store, tax, shipping, integration settings
└── shared/             Infrastructure only; no domain business rules
```

## Internal layout

Every domain follows the same shape when implementation starts:

```text
<domain>/
├── api/             FastAPI router and dependencies
├── schemas/         Pydantic request/response contracts
├── services/        Business use cases and policies
├── repositories/    Domain persistence
├── models/          SQLAlchemy models owned by this domain
├── events/          Published and consumed domain events
└── README.md        Ownership and public contracts
```

Folders are added only when they contain code. Empty layers are not required.

## Dependency rules

1. A module may import its own layers and `app.shared`.
2. A module must not import another module's models or repositories.
3. Cross-module calls use the target module's public service interface.
4. Asynchronous side effects use domain events.
5. Shared contains technical infrastructure only: database, configuration,
   logging, security primitives, event transport, and generic errors.
6. Each table has exactly one owning module.
7. `app.main` is the composition root that registers module routers.

## Current migration status

- Identity authentication and user management: migrated
- IAM roles and authorization: migrated
- `main.py`, database seeding, and Alembic: use domain imports
- Catalog and later features: must be implemented directly in this structure
- Shared infrastructure: still under `app/core` and `app/utils`; move separately

The old top-level user/role routes, schemas, services, repositories, constants,
and model files were removed after API compatibility checks.
