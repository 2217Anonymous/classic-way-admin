# Payments Module

Sandbox Razorpay-style payment orchestration. No real Razorpay keys are
required — provider order/payment IDs are generated as `*_demo_*` strings.

## Responsibilities

- Create a "Razorpay" payment intent for a pending order
- Accept and idempotently process webhook events (`payment_events.event_id`
  is unique, so replays are ignored)
- Verify a demo signature via the `X-Demo-Signature: ok` header (stands in
  for real HMAC verification)
- On successful capture, call into `orders.OrderService.mark_paid`
- Issue refunds and flip the order to `refunded`

## Owned data

`payments`, `payment_events`, `refunds`

## Implementation status (VL-020 to VL-022)

- `POST /payments/razorpay/create`: done
- `POST /payments/razorpay/webhook`: done — idempotent by `event_id`, demo
  signature header, no admin auth (webhook caller has no session)
- `POST /payments/{id}/refund`: done
- `GET /payments`: done
- Real Razorpay signature (HMAC-SHA256) verification: follow-up if a live
  integration is ever wired in
