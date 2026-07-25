# Notifications Module

Demo notification dispatch (email/SMS) — no real provider is wired up;
sending immediately marks the row `sent` and stores the rendered body.

## Responsibilities

- Queue/send templated notifications tied to an order
- Provide a notification log for support/ops visibility

## Owned data

`notifications`

## Implementation status (VL-027)

- `GET /notifications`: done
- `POST /notifications/send`: done — supports `order_confirmation`,
  `order_shipped`, `order_delivered`, `payment_received` templates plus a
  generic fallback for unknown template keys
- Real email/SMS provider integration (SES, Twilio, etc.): follow-up
