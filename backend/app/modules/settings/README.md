# Settings Module

Owns store-level configuration that does not belong to another domain.

## Package layout

`api/`, `models/`, `repositories/`, `schemas/`, `services/`

Split by concern: store, tax rules, coupons, theme.

## Responsibilities

- Store identity and contact details
- Tax configuration
- Coupon management
- Default / per-customer theme settings

## Owned data

`store_settings`, `tax_rules`, `coupons`, `theme`

Secrets such as payment and courier API keys are references to a secrets
manager, not plaintext settings rows.
