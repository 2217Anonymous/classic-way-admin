# Staging → Production Cutover (VL-031)

## Pre-cutover

1. Set `NEXT_PUBLIC_DEMO_MOCK=0` (or `false`) for production frontend builds.
2. Rotate `SECRET_KEY`, MySQL passwords, and admin password.
3. Configure CORS to production storefront/admin origins only.
4. Provision HTTPS (reverse proxy / cloud load balancer).
5. Configure Razorpay live keys + webhook secret (replace demo signature path).
6. Configure courier credentials (Shiprocket/Delhivery) or keep manual adapter.
7. Confirm MySQL automated backups and restore drill.
8. Run `alembic upgrade head` on production DB from a maintenance window.

## Cutover steps

1. Put storefront in maintenance banner (optional).
2. Deploy backend image; wait for `/health`.
3. Run migrations; verify tables: `orders`, `payments`, `shipments`, `inventory_items`.
4. Deploy frontend production build.
5. Smoke: login → inventory → place test COD order → mark paid → create shipment → track.
6. Enable monitoring (uptime on `/health`, 5xx alerts, disk for `/uploads`).

## Rollback

1. Redeploy previous backend/frontend images.
2. Do **not** downgrade destructive migrations unless prepared; prefer forward fixes.
3. Restore DB from pre-cutover backup if data corruption occurred.

## Post-cutover

- Monitor payment webhooks and shipment events for 24h.
- Confirm notification queue (email/SMS provider) once wired.
- Record cutover time and owners in the project tracker.
