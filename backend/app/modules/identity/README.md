# Identity Module

Owns authentication and user identity.

## Responsibilities

- Local email/password authentication with Argon2
- OIDC SSO (Keycloak, Microsoft Entra ID, Google)
- Access and refresh token lifecycle
- Sessions, logout, revocation, and account lockout
- SSO identity linking
- User account/profile lifecycle and active status
- Authentication audit events

## Owned data

`users`, `user_credentials`, `sso_identities`, `sessions`,
`refresh_tokens`, `login_attempts`

## Public contracts

- `authenticate_password(...)`
- `authenticate_oidc_callback(...)`
- `refresh_session(...)`
- `revoke_session(...)`
- `get_user_identity(...)`

Roles and permissions are resolved through the IAM public interface; this module
must not query IAM repositories directly.

## Implementation status

Password authentication, current-user resolution, user CRUD, schemas, models,
repositories, services, and API routes now live in this module.

SSO identities, refresh-token sessions, revocation, and account linking are the
next Identity features. Shared password/JWT primitives currently remain in
`app/core/security.py` until the shared-infrastructure migration.
