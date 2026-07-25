import type { Brand } from "@/lib/types";

const now = "2026-07-20T10:00:00.000Z";

export const mockBrands: Brand[] = [
  {
    id: 1,
    name: "Classic Way",
    slug: "classic-way",
    is_active: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: 2,
    name: "Tommy Hilfiger",
    slug: "tommy-hilfiger",
    is_active: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: 3,
    name: "Urban Thread",
    slug: "urban-thread",
    is_active: false,
    created_at: now,
    updated_at: now,
  },
];
