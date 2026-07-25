import type { Cart } from "@/lib/types";

import { mockProducts } from "./products";

const now = "2026-07-22T11:00:00.000Z";

function demoCart(): Cart {
  const p1 = mockProducts[0];
  const p2 = mockProducts[2];
  const items = [
    {
      id: 1,
      cart_id: 1,
      product_id: p1.id,
      product_name: p1.name,
      product_slug: p1.slug,
      variant_id: p1.variants[0]?.id ?? null,
      variant_label: p1.variants[0]
        ? Object.values(p1.variants[0].options).join(" / ")
        : null,
      sku: p1.sku,
      image_url: p1.primary_image_url,
      unit_price: Number(p1.price),
      quantity: 1,
      line_total: Number(p1.price),
    },
    {
      id: 2,
      cart_id: 1,
      product_id: p2.id,
      product_name: p2.name,
      product_slug: p2.slug,
      variant_id: p2.variants[1]?.id ?? null,
      variant_label: p2.variants[1]
        ? Object.values(p2.variants[1].options).join(" / ")
        : null,
      sku: p2.sku,
      image_url: p2.primary_image_url,
      unit_price: Number(p2.price),
      quantity: 2,
      line_total: Number(p2.price) * 2,
    },
  ];
  const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
  return {
    id: 1,
    cart_token: "demo-cart-token",
    customer_id: null,
    status: "active",
    items,
    subtotal,
    discount_total: 0,
    coupon_code: null,
    created_at: now,
    updated_at: now,
  };
}

export const mockCart: Cart = demoCart();
