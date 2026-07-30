import type {
  CustomerAddress,
  InventoryItem,
  InventorySettings,
  NotificationItem,
  Order,
  OrderItem,
  OrderStatus,
  OrderStatusHistoryEntry,
  PaymentMethod,
  PaymentStatus,
  ReportSummary,
  Shipment,
  ShipmentEvent,
  ShipmentStatus,
} from "@/lib/types";

function num(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function str(value: unknown, fallback = ""): string {
  if (value == null) return fallback;
  return String(value);
}

function paymentStatusFromOrder(status: string, method: string): PaymentStatus {
  if (status === "paid" || status === "delivered" || status === "shipped" || status === "processing") {
    return "paid";
  }
  if (status === "refunded" || status === "returned") return "refunded";
  if (status === "cancelled") return method === "cod" ? "pending" : "failed";
  return "pending";
}

function normalizeOrderStatus(status: string): OrderStatus {
  const allowed: OrderStatus[] = [
    "pending",
    "paid",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
    "returned",
    "draft",
  ];
  if (allowed.includes(status as OrderStatus)) return status as OrderStatus;
  return "pending";
}

function emptyAddress(partial?: Partial<CustomerAddress>): CustomerAddress {
  return {
    id: partial?.id ?? "",
    customer_id: partial?.customer_id ?? null,
    full_name: partial?.full_name ?? "",
    phone: partial?.phone ?? "",
    email: partial?.email ?? null,
    line1: partial?.line1 ?? "",
    line2: partial?.line2 ?? null,
    city: partial?.city ?? "",
    state: partial?.state ?? "",
    postal_code: partial?.postal_code ?? "",
    country: partial?.country ?? "India",
    is_default: partial?.is_default ?? false,
    created_at: partial?.created_at ?? "",
  };
}

export function normalizeOrderItem(raw: Record<string, unknown>): OrderItem {
  return {
    id: str(raw.id),
    order_id: str(raw.order_id),
    product_id: str(raw.product_id ?? ""),
    product_name: str(raw.product_name ?? raw.name, "Item"),
    variant_id: raw.variant_id == null ? null : str(raw.variant_id),
    variant_label: raw.variant_label == null ? null : str(raw.variant_label),
    sku: raw.sku == null ? null : str(raw.sku),
    image_url: raw.image_url == null ? null : str(raw.image_url),
    unit_price: num(raw.unit_price),
    quantity: num(raw.quantity, 1),
    line_total: num(raw.line_total),
  };
}

export function normalizeOrderStatusHistory(
  raw: Record<string, unknown>,
): OrderStatusHistoryEntry {
  return {
    id: str(raw.id),
    order_id: str(raw.order_id),
    from_status: raw.from_status == null ? null : str(raw.from_status),
    to_status: str(raw.to_status),
    note: raw.note == null ? null : str(raw.note),
    created_at: str(raw.created_at),
  };
}

export function normalizeOrder(raw: Record<string, unknown>): Order {
  const nestedShipping = (raw.shipping_address ?? null) as Record<string, unknown> | null;
  const shipping = emptyAddress({
    full_name: str(nestedShipping?.full_name ?? raw.shipping_name),
    phone: str(nestedShipping?.phone ?? raw.shipping_phone),
    line1: str(nestedShipping?.line1 ?? raw.shipping_line1),
    line2:
      nestedShipping?.line2 == null && raw.shipping_line2 == null
        ? null
        : str(nestedShipping?.line2 ?? raw.shipping_line2),
    city: str(nestedShipping?.city ?? raw.shipping_city),
    state: str(nestedShipping?.state ?? raw.shipping_state),
    postal_code: str(nestedShipping?.postal_code ?? raw.shipping_postal_code),
    country: str(nestedShipping?.country ?? raw.shipping_country, "India"),
  });

  const status = normalizeOrderStatus(str(raw.status, "pending"));
  const paymentMethod = (str(raw.payment_method, "cod") as PaymentMethod) || "cod";
  const itemsRaw = Array.isArray(raw.items) ? raw.items : [];
  const historyRaw = Array.isArray(raw.status_history) ? raw.status_history : [];

  const grandTotal = num(raw.grand_total ?? raw.total);
  const discountTotal = num(raw.discount_total ?? raw.discount_amount);
  const shippingTotal = num(raw.shipping_total ?? raw.shipping_amount);
  const taxTotal = num(raw.tax_total ?? raw.tax_amount);
  const placedAt = str(raw.placed_at ?? raw.created_at);

  return {
    id: str(raw.id),
    order_number: str(raw.order_number),
    customer_id: raw.customer_id == null ? null : str(raw.customer_id),
    customer_name: str(raw.customer_name ?? raw.shipping_name, "Customer"),
    customer_email: raw.customer_email == null ? null : str(raw.customer_email),
    customer_phone: raw.customer_phone == null ? str(raw.shipping_phone || "") || null : str(raw.customer_phone),
    status,
    payment_status: (raw.payment_status
      ? str(raw.payment_status)
      : paymentStatusFromOrder(status, paymentMethod)) as PaymentStatus,
    payment_method: paymentMethod === "razorpay" ? "razorpay" : "cod",
    items: itemsRaw.map((item) => normalizeOrderItem(item as Record<string, unknown>)),
    shipping_address: shipping,
    billing_address: (raw.billing_address as CustomerAddress | null) ?? null,
    subtotal: num(raw.subtotal),
    discount_total: discountTotal,
    shipping_total: shippingTotal,
    tax_total: taxTotal,
    grand_total: grandTotal,
    coupon_code: raw.coupon_code == null ? null : str(raw.coupon_code),
    notes: raw.notes == null ? null : str(raw.notes),
    status_history: historyRaw.map((entry) =>
      normalizeOrderStatusHistory(entry as Record<string, unknown>),
    ),
    placed_at: placedAt,
    created_at: str(raw.created_at, placedAt),
    updated_at: str(raw.updated_at, placedAt),
  };
}

export function normalizeInventoryItem(
  raw: Record<string, unknown>,
  threshold = 10,
): InventoryItem {
  const quantity = num(raw.stock ?? raw.quantity);
  const reserved = num(raw.reserved);
  const available = num(raw.available, quantity - reserved);
  const lowThreshold = num(raw.low_stock_threshold, threshold);
  const isLow =
    typeof raw.is_low_stock === "boolean"
      ? raw.is_low_stock
      : available <= lowThreshold;
  const isOut =
    typeof raw.is_out_of_stock === "boolean" ? raw.is_out_of_stock : available <= 0;

  return {
    id: str(raw.id),
    product_id: str(raw.product_id ?? ""),
    product_name: str(raw.product_name, "Unknown product"),
    sku: raw.sku == null ? null : str(raw.sku),
    variant_id: raw.variant_id == null ? null : str(raw.variant_id),
    variant_label: raw.variant_label == null ? null : str(raw.variant_label),
    image_url: raw.image_url == null ? null : str(raw.image_url),
    stock: quantity,
    reserved,
    available,
    low_stock_threshold: lowThreshold,
    is_low_stock: isLow,
    is_out_of_stock: isOut,
    updated_at: str(raw.updated_at),
  };
}

export function normalizeInventorySettings(raw: Record<string, unknown>): InventorySettings {
  return {
    id: str(raw.id),
    default_low_stock_threshold: num(
      raw.default_low_stock_threshold ?? raw.low_stock_threshold,
      10,
    ),
    backorders_allowed: Boolean(raw.backorders_allowed ?? false),
    updated_at: str(raw.updated_at),
  };
}

function normalizeShipmentStatus(status: string): ShipmentStatus {
  const map: Record<string, ShipmentStatus> = {
    pending: "pending",
    created: "pending",
    scheduled: "scheduled",
    pickup_scheduled: "scheduled",
    picked_up: "picked_up",
    in_transit: "in_transit",
    out_for_delivery: "out_for_delivery",
    delivered: "delivered",
    exception: "exception",
    rto: "exception",
    cancelled: "exception",
  };
  return map[status] ?? "pending";
}

export function normalizeShipment(raw: Record<string, unknown>): Shipment {
  const eventsRaw = Array.isArray(raw.events) ? raw.events : [];
  const events: ShipmentEvent[] = eventsRaw.map((event) => {
    const row = event as Record<string, unknown>;
    return {
      id: str(row.id),
      shipment_id: str(row.shipment_id ?? raw.id),
      status: str(row.status),
      description: str(row.description ?? row.message, ""),
      location: row.location == null ? null : str(row.location),
      occurred_at: str(row.occurred_at ?? row.event_at),
    };
  });

  return {
    id: str(raw.id),
    order_id: str(raw.order_id),
    order_number: str(raw.order_number, "—"),
    carrier: str(raw.carrier ?? raw.courier_provider, "manual"),
    tracking_number: str(raw.tracking_number ?? raw.awb, "—"),
    status: normalizeShipmentStatus(str(raw.status, "pending")),
    exception_flag: Boolean(raw.exception_flag),
    exception_reason: raw.exception_reason == null ? null : str(raw.exception_reason),
    pickup_scheduled_at:
      raw.pickup_scheduled_at == null ? null : str(raw.pickup_scheduled_at),
    estimated_delivery:
      raw.estimated_delivery == null ? null : str(raw.estimated_delivery),
    events,
    created_at: str(raw.created_at),
    updated_at: str(raw.updated_at),
  };
}

export function normalizeNotification(raw: Record<string, unknown>): NotificationItem {
  const channel = str(raw.channel, "email");
  return {
    id: str(raw.id),
    channel: (channel === "sms" || channel === "push" ? channel : "email") as NotificationItem["channel"],
    event: str(raw.event ?? raw.template_key, "notification"),
    recipient: str(raw.recipient),
    subject: str(raw.subject, ""),
    message: str(raw.message ?? raw.body, ""),
    status: (str(raw.status, "queued") as NotificationItem["status"]) || "queued",
    sent_at: raw.sent_at == null ? (raw.status === "sent" ? str(raw.created_at) : null) : str(raw.sent_at),
    created_at: str(raw.created_at),
  };
}

export function normalizeReportSummary(raw: Record<string, unknown>): ReportSummary {
  const totalOrders = num(raw.total_orders ?? raw.orders_count);
  const totalRevenue = num(raw.total_revenue ?? raw.revenue);
  const paidCount = num(raw.paid_count);
  return {
    id: str(raw.id, "summary"),
    period: str(raw.period, "All time"),
    total_orders: totalOrders,
    total_revenue: totalRevenue,
    total_refunds: num(raw.total_refunds),
    avg_order_value: num(
      raw.avg_order_value,
      paidCount > 0 ? totalRevenue / paidCount : totalOrders > 0 ? totalRevenue / totalOrders : 0,
    ),
    new_customers: num(raw.new_customers),
    low_stock_items: num(raw.low_stock_items ?? raw.low_stock_count),
    pending_shipments: num(raw.pending_shipments),
    generated_at: str(raw.generated_at, new Date().toISOString()),
  };
}
