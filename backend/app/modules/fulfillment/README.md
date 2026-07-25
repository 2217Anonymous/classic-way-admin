# Fulfillment Module

Shipment creation, pickup scheduling, tracking events, and exception
handling. Uses a manual/sandbox courier adapter — no live Shiprocket or
Delhivery keys required. Also exposes the public order tracking lookup.

## Responsibilities

- Create shipments for paid/pending orders with a demo AWB (`AWB-DEMO-...`)
  and a placeholder label URL
- Schedule pickup, ingest tracking events (`webhook`/`poll`/`manual`), and
  flag manual exceptions
- Public tracking lookup by order number (`/track/{order_number}`)

## Owned data

`courier_accounts`, `shipments`, `shipment_events`

## Implementation status (VL-023 to VL-026)

- `GET/POST /shipments`: done
- `POST /shipments/{id}/pickup`: done
- `POST /shipments/{id}/events`: done
- `POST /shipments/{id}/exception`: done
- `GET /shipments/{id}/timeline`: done
- `GET /track/{order_number}`: done — public, no auth, returns order status
  + shipment timeline
- Real courier API polling/webhooks (Shiprocket/Delhivery): follow-up
