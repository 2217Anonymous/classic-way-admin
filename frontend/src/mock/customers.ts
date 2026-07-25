import type { AdminCustomer } from "@/lib/types";

const now = "2026-07-18T09:30:00.000Z";

export const mockCustomers: AdminCustomer[] = [
  {
    id: 1,
    email: "priya.sharma@example.com",
    full_name: "Priya Sharma",
    phone: "+91 98765 43210",
    is_active: true,
    email_verified: true,
    created_at: "2026-06-01T08:00:00.000Z",
    updated_at: now,
  },
  {
    id: 2,
    email: "arjun.nair@example.com",
    full_name: "Arjun Nair",
    phone: "+91 91234 56789",
    is_active: true,
    email_verified: false,
    created_at: "2026-06-15T11:20:00.000Z",
    updated_at: now,
  },
  {
    id: 3,
    email: "meera.patel@example.com",
    full_name: "Meera Patel",
    phone: null,
    is_active: false,
    email_verified: true,
    created_at: "2026-07-02T14:45:00.000Z",
    updated_at: now,
  },
];
