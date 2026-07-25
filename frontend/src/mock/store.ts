import type { StoreSettings } from "@/lib/types";

const now = "2026-07-20T10:00:00.000Z";

export const mockStoreSettings: StoreSettings = {
  id: 1,
  store_name: "Classic Way",
  legal_name: "Classic Way Retail Pvt Ltd",
  email: "hello@classicway.example",
  phone: "+91 98765 43210",
  address_line1: "12 Market Street",
  address_line2: "T. Nagar",
  city: "Chennai",
  state: "Tamil Nadu",
  postal_code: "600017",
  country: "India",
  currency: "INR",
  timezone: "Asia/Kolkata",
  created_at: now,
  updated_at: now,
};
