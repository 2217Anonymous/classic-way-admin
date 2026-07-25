# Postman

Import `Valaiyagam-Admin-API.postman_collection.json` into Postman.

## Setup

1. Collection variable `baseUrl` defaults to `http://localhost:8000/api/v1`.
2. Set `adminEmail` / `adminPassword` to match `INITIAL_ADMIN_*` in `admin/backend/.env`.
3. Run **Auth → Login** first — it saves `accessToken` for bearer auth.

## Notes

- Only **mounted** admin API routes are included.
- Orphaned shopping-customer APIs were removed from the codebase and are not in this collection.
- Live OpenAPI docs: `http://localhost:8000/docs`
