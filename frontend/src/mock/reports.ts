import type { ReportSummary } from "@/lib/types";

import { mockOrders } from "./orders";
import { mockInventoryItems } from "./inventory";
import { mockShipments } from "./shipments";

function computeSummary(period: string, daysBack: number): ReportSummary {
  const cutoff = Date.now() - daysBack * 24 * 60 * 60 * 1000;
  const inRange = mockOrders.filter(
    (order) => new Date(order.placed_at).getTime() >= cutoff,
  );
  const revenueOrders = inRange.filter((order) => order.payment_status === "paid");
  const totalRevenue = revenueOrders.reduce((sum, order) => sum + order.grand_total, 0);
  const totalRefunds = inRange
    .filter((order) => order.payment_status === "refunded")
    .reduce((sum, order) => sum + order.grand_total, 0);

  return {
    id: daysBack,
    period,
    total_orders: inRange.length,
    total_revenue: Math.round(totalRevenue * 100) / 100,
    total_refunds: Math.round(totalRefunds * 100) / 100,
    avg_order_value:
      revenueOrders.length > 0
        ? Math.round((totalRevenue / revenueOrders.length) * 100) / 100
        : 0,
    new_customers: Math.max(1, Math.round(inRange.length * 0.6)),
    low_stock_items: mockInventoryItems.filter((item) => item.is_low_stock).length,
    pending_shipments: mockShipments.filter(
      (shipment) => shipment.status === "pending" || shipment.status === "scheduled",
    ).length,
    generated_at: new Date().toISOString(),
  };
}

export const mockReportSummaries: ReportSummary[] = [
  computeSummary("Last 7 days", 7),
  computeSummary("Last 30 days", 30),
  computeSummary("Last 90 days", 90),
];
