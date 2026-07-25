import type { Payment, Refund } from "@/lib/types";

import { mockOrders } from "./orders";

export const mockPayments: Payment[] = mockOrders.map((order) => ({
  id: order.id,
  order_id: order.id,
  order_number: order.order_number,
  provider: order.payment_method,
  provider_ref:
    order.payment_method === "razorpay"
      ? `pay_${order.order_number.replace("CW-", "")}${order.id}xyz`
      : null,
  amount: order.grand_total,
  status: order.payment_status,
  captured_at: order.payment_status === "paid" ? order.placed_at : null,
  created_at: order.placed_at,
}));

export const mockRefunds: Refund[] = mockOrders
  .filter((order) => order.payment_status === "refunded")
  .map((order, index) => ({
    id: index + 1,
    payment_id: order.id,
    order_id: order.id,
    order_number: order.order_number,
    amount: order.grand_total,
    reason:
      order.status === "cancelled" ? "Customer requested cancellation" : "Product returned",
    status: "processed" as const,
    created_at: order.updated_at,
  }));
