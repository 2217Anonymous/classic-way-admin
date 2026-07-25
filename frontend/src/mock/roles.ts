import type { Role } from "@/lib/types";

const now = "2026-07-01T10:00:00.000Z";

export const mockRoles: Role[] = [
  {
    id: 1,
    name: "Admin",
    description: "Full system access for Classic Way store operations.",
    created_at: now,
  },
  {
    id: 2,
    name: "Manager",
    description: "Manage catalog, orders overview, and staff users.",
    created_at: now,
  },
  {
    id: 3,
    name: "Editor",
    description: "Create and update products, categories, and attributes.",
    created_at: now,
  },
  {
    id: 4,
    name: "Support",
    description: "Read catalog and assist customer inquiries.",
    created_at: now,
  },
  {
    id: 5,
    name: "Viewer",
    description: "Read-only access to admin dashboards.",
    created_at: now,
  },
  {
    id: 6,
    name: "Marketing",
    description: "Manage tags, visibility, and promotional product fields.",
    created_at: now,
  },
  {
    id: 7,
    name: "Warehouse",
    description: "Update stock levels and SKU availability.",
    created_at: now,
  },
  {
    id: 8,
    name: "Finance",
    description: "View pricing and revenue-related product metrics.",
    created_at: now,
  },
];
