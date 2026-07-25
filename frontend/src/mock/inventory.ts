import type { InventoryItem, InventorySettings } from "@/lib/types";

import { mockProducts } from "./products";

const now = "2026-07-20T10:00:00.000Z";

function buildInventoryItems(): InventoryItem[] {
  const items: InventoryItem[] = [];
  let id = 1;

  mockProducts.forEach((product) => {
    if (product.variants.length > 0) {
      product.variants.forEach((variant) => {
        const reserved = Math.round(variant.stock * 0.08);
        const threshold = 15;
        const available = Math.max(0, variant.stock - reserved);
        items.push({
          id: id++,
          product_id: product.id,
          product_name: product.name,
          sku: variant.sku,
          variant_id: variant.id,
          variant_label: Object.entries(variant.options)
            .map(([, value]) => value)
            .join(" / "),
          image_url: product.primary_image_url,
          stock: variant.stock,
          reserved,
          available,
          low_stock_threshold: threshold,
          is_low_stock: available > 0 && available <= threshold,
          is_out_of_stock: available <= 0,
          updated_at: now,
        });
      });
    } else {
      const reserved = Math.round(product.stock * 0.05);
      const threshold = 20;
      const available = Math.max(0, product.stock - reserved);
      items.push({
        id: id++,
        product_id: product.id,
        product_name: product.name,
        sku: product.sku,
        variant_id: null,
        variant_label: null,
        image_url: product.primary_image_url,
        stock: product.stock,
        reserved,
        available,
        low_stock_threshold: threshold,
        is_low_stock: available > 0 && available <= threshold,
        is_out_of_stock: available <= 0,
        updated_at: now,
      });
    }
  });

  // Force a couple of low/out-of-stock rows so the panel demo is meaningful.
  if (items[2]) {
    items[2] = { ...items[2], stock: 6, reserved: 1, available: 5, is_low_stock: true, is_out_of_stock: false };
  }
  if (items[5]) {
    items[5] = { ...items[5], stock: 0, reserved: 0, available: 0, is_low_stock: false, is_out_of_stock: true };
  }

  return items;
}

export const mockInventoryItems: InventoryItem[] = buildInventoryItems();

export const mockInventorySettings: InventorySettings = {
  id: 1,
  default_low_stock_threshold: 15,
  backorders_allowed: false,
  updated_at: now,
};
