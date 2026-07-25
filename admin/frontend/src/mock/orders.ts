import type { Order, OrderItem, OrderStatus, PaymentStatus } from "@/lib/types";

import { mockAddresses } from "./addresses";
import { mockProducts } from "./products";

function itemsFor(orderId: number, productIndexes: number[]): OrderItem[] {
  return productIndexes.map((index, i) => {
    const product = mockProducts[index % mockProducts.length];
    const variant = product.variants[i % Math.max(product.variants.length, 1)];
    const quantity = 1 + (i % 2);
    const unitPrice = Number(product.price);
    return {
      id: orderId * 10 + i,
      order_id: orderId,
      product_id: product.id,
      product_name: product.name,
      variant_id: variant?.id ?? null,
      variant_label: variant
        ? Object.values(variant.options).join(" / ")
        : null,
      sku: product.sku,
      image_url: product.primary_image_url,
      unit_price: unitPrice,
      quantity,
      line_total: unitPrice * quantity,
    };
  });
}

type Blueprint = {
  id: number;
  daysAgo: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  method: "razorpay" | "cod";
  productIndexes: number[];
  customerName: string;
  addressIndex: number;
};

const blueprints: Blueprint[] = [
  { id: 1, daysAgo: 12, status: "delivered", paymentStatus: "paid", method: "razorpay", productIndexes: [0, 1], customerName: "Arun Kumar", addressIndex: 0 },
  { id: 2, daysAgo: 9, status: "shipped", paymentStatus: "paid", method: "razorpay", productIndexes: [2], customerName: "Priya Raman", addressIndex: 1 },
  { id: 3, daysAgo: 6, status: "processing", paymentStatus: "paid", method: "cod", productIndexes: [3, 4], customerName: "Vikram Singh", addressIndex: 0 },
  { id: 4, daysAgo: 4, status: "paid", paymentStatus: "paid", method: "razorpay", productIndexes: [5], customerName: "Deepa Nair", addressIndex: 1 },
  { id: 5, daysAgo: 2, status: "pending", paymentStatus: "pending", method: "cod", productIndexes: [6, 7], customerName: "Karthik Iyer", addressIndex: 0 },
  { id: 6, daysAgo: 20, status: "cancelled", paymentStatus: "refunded", method: "razorpay", productIndexes: [8], customerName: "Meena Ramesh", addressIndex: 1 },
  { id: 7, daysAgo: 30, status: "refunded", paymentStatus: "refunded", method: "razorpay", productIndexes: [9, 10], customerName: "Suresh Babu", addressIndex: 0 },
];

function buildOrder(bp: Blueprint): Order {
  const placedAt = new Date(Date.now() - bp.daysAgo * 24 * 60 * 60 * 1000).toISOString();
  const items = itemsFor(bp.id, bp.productIndexes);
  const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
  const shipping_total = subtotal > 999 ? 0 : 60;
  const tax_total = Math.round(subtotal * 0.05 * 100) / 100;
  const discount_total = bp.id % 3 === 0 ? Math.round(subtotal * 0.1 * 100) / 100 : 0;
  const grand_total = Math.round((subtotal + shipping_total + tax_total - discount_total) * 100) / 100;
  const address = mockAddresses[bp.addressIndex];

  return {
    id: bp.id,
    order_number: `CW-${1000 + bp.id}`,
    customer_id: null,
    customer_name: bp.customerName,
    customer_email: `${bp.customerName.toLowerCase().replace(/\s+/g, ".")}@example.com`,
    customer_phone: address.phone,
    status: bp.status,
    payment_status: bp.paymentStatus,
    payment_method: bp.method,
    items,
    shipping_address: address,
    billing_address: null,
    subtotal,
    discount_total,
    shipping_total,
    tax_total,
    grand_total,
    coupon_code: discount_total > 0 ? "WELCOME10" : null,
    notes: null,
    placed_at: placedAt,
    created_at: placedAt,
    updated_at: placedAt,
  };
}

export const mockOrders: Order[] = blueprints.map(buildOrder);
