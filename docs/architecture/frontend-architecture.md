# Frontend Architecture

## Apps

| App | Path | Port | Stack |
|-----|------|------|-------|
| Admin | `frontend` | 3000 | Next.js 16, React 19, Redux Toolkit, Tailwind 4 |
| Shopping | `shopping/frontend` | 3001 | Next.js 16, React 19, Redux Toolkit, Tailwind 4, Swiper |

## Admin

- Tabbed dashboard shell (`/?tab=...`) plus product CRUD routes
- Optional Classic Way mini-store at `/shop`
- Data source toggle: Mock vs live API (`NEXT_PUBLIC_DEMO_MOCK`)

## Shopping

Feature-oriented layout:

```text
src/
  app/                 # App Router pages
  components/          # UI by domain (home, shop, product, layout, pages)
  features/            # (optional growth area)
  services/            # REST clients → shopping backend
  store/slices/        # auth, cart, wishlist, compare, ui
  data/                # Static fallback catalog
  lib/                 # api client, mappers, utils
  types/
```

### State

- **Redux:** cart, wishlist, compare, auth, UI drawers
- **Server/API:** products, checkout, orders when backend is reachable
- **Fallback:** static fashion data if API is down

### Rendering

- SSR-friendly product/shop routes where data is fetched in client components today; expand to server components as SEO needs grow
- Interactive cart/wishlist/compare remain CSR
