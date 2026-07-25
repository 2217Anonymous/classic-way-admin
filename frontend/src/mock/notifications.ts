import type { NotificationItem } from "@/lib/types";

import { mockOrders } from "./orders";

const now = Date.now();

function hoursAgo(hours: number) {
  return new Date(now - hours * 60 * 60 * 1000).toISOString();
}

export const mockNotifications: NotificationItem[] = [
  {
    id: 1,
    channel: "email",
    event: "order.placed",
    recipient: mockOrders[4].customer_email ?? "customer@example.com",
    subject: `Order ${mockOrders[4].order_number} confirmed`,
    message: `Thanks for your order! ${mockOrders[4].order_number} has been placed successfully.`,
    status: "sent",
    sent_at: hoursAgo(48),
    created_at: hoursAgo(48),
  },
  {
    id: 2,
    channel: "sms",
    event: "order.shipped",
    recipient: mockOrders[1].customer_phone ?? "+91 90000 00000",
    subject: `Order ${mockOrders[1].order_number} shipped`,
    message: `Your order ${mockOrders[1].order_number} is on the way. Track it on our site.`,
    status: "sent",
    sent_at: hoursAgo(96),
    created_at: hoursAgo(96),
  },
  {
    id: 3,
    channel: "email",
    event: "shipment.exception",
    recipient: mockOrders[1].customer_email ?? "customer@example.com",
    subject: `Delivery issue with ${mockOrders[1].order_number}`,
    message: "We ran into an issue delivering your package. Our team is on it.",
    status: "sent",
    sent_at: hoursAgo(40),
    created_at: hoursAgo(40),
  },
  {
    id: 4,
    channel: "push",
    event: "order.delivered",
    recipient: mockOrders[0].customer_email ?? "customer@example.com",
    subject: `Order ${mockOrders[0].order_number} delivered`,
    message: "Your order has been delivered. Enjoy your new Classic Way pieces!",
    status: "sent",
    sent_at: hoursAgo(200),
    created_at: hoursAgo(200),
  },
  {
    id: 5,
    channel: "email",
    event: "payment.failed",
    recipient: "unknown@example.com",
    subject: "Payment failed for your order",
    message: "We couldn't process your payment. Please try again.",
    status: "failed",
    sent_at: null,
    created_at: hoursAgo(20),
  },
];
