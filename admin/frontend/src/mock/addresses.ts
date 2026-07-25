import type { CustomerAddress } from "@/lib/types";

const now = "2026-07-18T09:00:00.000Z";

export const mockAddresses: CustomerAddress[] = [
  {
    id: 1,
    customer_id: null,
    full_name: "Arun Kumar",
    phone: "+91 98765 43210",
    email: "arun.kumar@example.com",
    line1: "12, Gandhi Street",
    line2: "Near Bus Stand",
    city: "Coimbatore",
    state: "Tamil Nadu",
    postal_code: "641001",
    country: "India",
    is_default: true,
    created_at: now,
  },
  {
    id: 2,
    customer_id: null,
    full_name: "Arun Kumar",
    phone: "+91 98765 43210",
    email: "arun.kumar@example.com",
    line1: "45, Anna Nagar 2nd Street",
    line2: null,
    city: "Chennai",
    state: "Tamil Nadu",
    postal_code: "600040",
    country: "India",
    is_default: false,
    created_at: now,
  },
];
