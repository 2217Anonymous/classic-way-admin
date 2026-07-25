import type { AdminReview } from "@/lib/types";

const now = "2026-07-21T16:00:00.000Z";

export const mockAdminReviews: AdminReview[] = [
  {
    id: 1,
    product_id: 1,
    customer_id: 1,
    customer_name: "Priya Sharma",
    rating: 5,
    title: "Soft and true to size",
    body: "Great quality sweatshirt. Soft fabric and exact color match.",
    is_verified_purchase: true,
    is_approved: true,
    created_at: "2026-07-12T10:00:00.000Z",
    updated_at: now,
  },
  {
    id: 2,
    product_id: 2,
    customer_id: 2,
    customer_name: "Arjun Nair",
    rating: 4,
    title: "Good everyday tee",
    body: "Comfortable fit. Slightly thin fabric but fine for summer.",
    is_verified_purchase: true,
    is_approved: false,
    created_at: "2026-07-19T08:30:00.000Z",
    updated_at: now,
  },
  {
    id: 3,
    product_id: 1,
    customer_id: 3,
    customer_name: "Meera Patel",
    rating: 2,
    title: "Runs large",
    body: "Quality is okay but sizing chart seemed off.",
    is_verified_purchase: false,
    is_approved: false,
    created_at: "2026-07-20T13:15:00.000Z",
    updated_at: now,
  },
];
