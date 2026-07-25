# IAM Module

Owns authorization: roles, permissions, policies, and assignments.

## Responsibilities

- Roles and permissions CRUD
- User-role and role-permission assignments
- Protected system roles
- Policy checks such as `users.manage` and `payments.refund`
- Authorization audit events
- Permission claims supplied to Identity token issuance

## Owned data

`roles`, `permissions`, `role_permissions`, `user_roles`

## Public contracts

- `get_user_roles(user_id)`
- `get_user_permissions(user_id)`
- `require_permission(permission)`
- `assign_roles(user_id, role_ids)`

## Implementation status

Role models, constants, schemas, repositories, services, API routes, and
authorization dependencies now live in this module.

`public.py` is the supported interface for other modules. Identity uses it to
resolve and assign roles without importing the IAM repository.

Fine-grained permissions and role-permission assignments are planned next.
