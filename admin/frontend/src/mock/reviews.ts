import type { Product } from "@/lib/types";

export type MockReview = {
  id: number;
  product_id: number;
  author: string;
  rating: number;
  comment: string;
  date: string;
  images: string[];
};

export const mockReviews: MockReview[] = [
  {
    id: 1,
    product_id: 1,
    author: "Henry",
    rating: 4.2,
    comment:
      "Great quality sweatshirt. Soft fabric and true to size. The pink color looks exactly like the photos.",
    date: "12 Jul, 21",
    images: [
      "https://picsum.photos/seed/rev1a/120/120",
      "https://picsum.photos/seed/rev1b/120/120",
      "https://picsum.photos/seed/rev1c/120/120",
    ],
  },
  {
    id: 2,
    product_id: 1,
    author: "Nancy",
    rating: 5,
    comment: "Perfect winter wear. Stitching is neat and delivery was fast.",
    date: "05 Aug, 21",
    images: ["https://picsum.photos/seed/rev2a/120/120"],
  },
  {
    id: 3,
    product_id: 1,
    author: "Joseph",
    rating: 3.8,
    comment: "Good overall, but runs slightly large. Still happy with the purchase.",
    date: "18 Sep, 21",
    images: [],
  },
];

export function reviewsForProduct(productId: number): MockReview[] {
  const matched = mockReviews.filter((item) => item.product_id === productId);
  if (matched.length > 0) return matched;
  return mockReviews.map((item, index) => ({
    ...item,
    id: productId * 100 + index,
    product_id: productId,
  }));
}

export const mockRatingSummary = {
  average: 4.5,
  totalLabel: "5.50k",
  distribution: [
    { stars: 5, count: 2750, tone: "#0ab39c" },
    { stars: 4, count: 1660, tone: "#16a34a" },
    { stars: 3, count: 720, tone: "#3577f1" },
    { stars: 2, count: 240, tone: "#f7b84b" },
    { stars: 1, count: 130, tone: "#f06548" },
  ],
};

/** Ensure product detail page always has demo-ready content. */
export function enrichProductForDetails(product: Product): Product {
  return product;
}
