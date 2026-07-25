# Settings Module

Owns store-level configuration that does not belong to another domain.

## Responsibilities

- Store identity and contact details
- Tax configuration
- Shipping zones and COD policies
- Feature flags
- Integration enablement metadata

## Owned data

`store_settings`, `tax_rules`, `shipping_zones`, `feature_flags`

Secrets such as payment and courier API keys are references to a secrets
manager, not plaintext settings rows.
