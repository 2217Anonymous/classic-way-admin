import type { TaxRule } from "@/lib/types";

const now = "2026-07-20T10:00:00.000Z";

export const mockTaxRules: TaxRule[] = [
  {
    id: 1,
    name: "GST Standard",
    code: "GST18",
    rate_percent: 18,
    is_inclusive: false,
    country: "India",
    state: null,
    is_active: true,
    sort_order: 0,
    created_at: now,
    updated_at: now,
  },
  {
    id: 2,
    name: "GST Reduced",
    code: "GST5",
    rate_percent: 5,
    is_inclusive: false,
    country: "India",
    state: null,
    is_active: true,
    sort_order: 1,
    created_at: now,
    updated_at: now,
  },
  {
    id: 3,
    name: "Tamil Nadu SGST",
    code: "TN-SGST",
    rate_percent: 9,
    is_inclusive: true,
    country: "India",
    state: "Tamil Nadu",
    is_active: false,
    sort_order: 2,
    created_at: now,
    updated_at: now,
  },
];
