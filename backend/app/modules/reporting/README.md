# Reporting Module

Read-only KPIs and exports aggregated from `orders`, `payments`,
`fulfillment`, and `inventory`. Owns no tables of its own.

## Package layout

`api/`, `schemas/`, `services/` (no `models/` / `repositories/`)

## Responsibilities

- Store-wide KPI summary (orders, revenue, paid orders, pending shipments,
  low-stock count)
- CSV sales export

## Owned data

None.

## Implementation status (VL-028/VL-029)

- `GET /reports/summary`: done
- `GET /reports/sales.csv`: done
