export type Role = {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
};

export type User = {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  roles: Role[];
  created_at: string;
  updated_at: string;
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
  user: User;
};

export type CreateUserInput = {
  email: string;
  full_name: string;
  password: string;
  role_ids: number[];
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type CategoryTreeNode = Category & {
  children: CategoryTreeNode[];
};

export type CategoryInput = {
  name: string;
  slug?: string;
  description?: string;
  parent_id?: number | null;
  is_active?: boolean;
  sort_order?: number;
};

export type ProductMedia = {
  id: number;
  product_id: number;
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
};

export type ProductAttribute = {
  id: number;
  product_id: number;
  name: string;
  values: string[];
  sort_order: number;
  created_at: string;
};

export type ProductVariant = {
  id: number;
  product_id: number;
  sku: string;
  price: string | number | null;
  stock: number;
  options: Record<string, string>;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type AttributeDefinition = {
  id: number;
  name: string;
  values: string[];
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AttributeDefinitionInput = {
  name: string;
  values: string[];
  sort_order?: number;
  is_active?: boolean;
};

export type ProductAttributeInput = {
  name: string;
  values: string[];
  sort_order?: number;
};

export type ProductVariantInput = {
  sku: string;
  price?: number | null;
  stock?: number;
  options?: Record<string, string>;
  is_active?: boolean;
  sort_order?: number;
};

export type Brand = {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type BrandInput = {
  name: string;
  slug?: string;
  is_active?: boolean;
};

export type AdminCustomer = {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminReview = {
  id: number;
  product_id: number;
  customer_id: number;
  customer_name: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  is_verified_purchase: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  price: string | number;
  compare_at_price: string | number | null;
  discount_percent: string | number | null;
  sku: string | null;
  manufacturer_name: string | null;
  manufacturer_brand: string | null;
  stock: number;
  tags: string | null;
  visibility: string;
  published_at: string | null;
  category_id: number | null;
  category_name: string | null;
  brand_id?: number | null;
  is_published: boolean;
  is_active: boolean;
  is_featured?: boolean;
  is_trending?: boolean;
  is_best_seller?: boolean;
  exchangeable: boolean;
  refundable: boolean;
  sort_order: number;
  primary_image_url: string | null;
  media: ProductMedia[];
  attributes: ProductAttribute[];
  variants: ProductVariant[];
  created_at: string;
  updated_at: string;
};

export type ProductInput = {
  name: string;
  slug?: string;
  description?: string;
  short_description?: string | null;
  price: number;
  compare_at_price?: number | null;
  discount_percent?: number | null;
  sku?: string | null;
  manufacturer_name?: string | null;
  manufacturer_brand?: string | null;
  stock?: number;
  tags?: string | null;
  visibility?: string;
  published_at?: string | null;
  category_id?: number | null;
  brand_id?: number | null;
  is_published?: boolean;
  is_active?: boolean;
  is_featured?: boolean;
  is_trending?: boolean;
  is_best_seller?: boolean;
  exchangeable?: boolean;
  refundable?: boolean;
  sort_order?: number;
  attributes?: ProductAttributeInput[];
  variants?: ProductVariantInput[];
};

export type StoreSettings = {
  id: number;
  store_name: string;
  legal_name: string | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  currency: string;
  timezone: string;
  created_at: string;
  updated_at: string;
};

export type StoreSettingsInput = {
  store_name: string;
  legal_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  currency?: string;
  timezone?: string;
};

export type TaxRule = {
  id: number;
  name: string;
  code: string;
  rate_percent: string | number;
  is_inclusive: boolean;
  country: string | null;
  state: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TaxRuleInput = {
  name: string;
  code: string;
  rate_percent: number;
  is_inclusive?: boolean;
  country?: string | null;
  state?: string | null;
  is_active?: boolean;
  sort_order?: number;
};

export type Coupon = {
  id: number;
  code: string;
  name: string;
  discount_type: "percent" | "fixed";
  discount_value: string | number;
  min_order_amount: string | number | null;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CouponInput = {
  code: string;
  name: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_order_amount?: number | null;
  max_uses?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  is_active?: boolean;
};

/* ------------------------------------------------------------------ */
/* Inventory (VL-013 / VL-014)                                         */
/* ------------------------------------------------------------------ */

export type InventoryItem = {
  id: number;
  product_id: number;
  product_name: string;
  sku: string | null;
  variant_id: number | null;
  variant_label: string | null;
  image_url: string | null;
  stock: number;
  reserved: number;
  available: number;
  low_stock_threshold: number;
  is_low_stock: boolean;
  is_out_of_stock: boolean;
  updated_at: string;
};

export type InventoryAdjustInput = {
  delta: number;
  reason: string;
};

export type InventorySettings = {
  id: number;
  default_low_stock_threshold: number;
  backorders_allowed: boolean;
  updated_at: string;
};

export type InventorySettingsInput = {
  default_low_stock_threshold: number;
  backorders_allowed: boolean;
};

/* ------------------------------------------------------------------ */
/* Cart (VL-015 / VL-016)                                              */
/* ------------------------------------------------------------------ */

export type CartItem = {
  id: number;
  cart_id: number;
  product_id: number;
  product_name: string;
  product_slug: string;
  variant_id: number | null;
  variant_label: string | null;
  sku: string | null;
  image_url: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
};

export type Cart = {
  id: number;
  cart_token: string;
  customer_id: number | null;
  status: "active" | "converted" | "abandoned";
  items: CartItem[];
  subtotal: number;
  discount_total: number;
  coupon_code: string | null;
  created_at: string;
  updated_at: string;
};

/* ------------------------------------------------------------------ */
/* Addresses (VL-017)                                                  */
/* ------------------------------------------------------------------ */

export type CustomerAddress = {
  id: number;
  customer_id: number | null;
  full_name: string;
  phone: string;
  email: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  created_at: string;
};

export type CustomerAddressInput = {
  full_name: string;
  phone: string;
  email?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country?: string;
  is_default?: boolean;
};

/* ------------------------------------------------------------------ */
/* Orders (VL-018 - VL-021)                                            */
/* ------------------------------------------------------------------ */

export type OrderItem = {
  id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  variant_id: number | null;
  variant_label: string | null;
  sku: string | null;
  image_url: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
};

export type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type PaymentMethod = "razorpay" | "cod";

export type Order = {
  id: number;
  order_number: string;
  customer_id: number | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  items: OrderItem[];
  shipping_address: CustomerAddress;
  billing_address: CustomerAddress | null;
  subtotal: number;
  discount_total: number;
  shipping_total: number;
  tax_total: number;
  grand_total: number;
  coupon_code: string | null;
  notes: string | null;
  placed_at: string;
  created_at: string;
  updated_at: string;
};

export type CreateOrderInput = {
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  items: {
    product_id: number;
    product_name: string;
    product_slug?: string;
    variant_id?: number | null;
    variant_label?: string | null;
    sku?: string | null;
    image_url?: string | null;
    unit_price: number;
    quantity: number;
  }[];
  shipping_address: CustomerAddressInput;
  billing_address?: CustomerAddressInput | null;
  payment_method: PaymentMethod;
  coupon_code?: string | null;
  discount_total?: number;
  shipping_total?: number;
  tax_total?: number;
  notes?: string | null;
};

/* ------------------------------------------------------------------ */
/* Payments & Refunds (VL-022 / VL-023)                                */
/* ------------------------------------------------------------------ */

export type Payment = {
  id: number;
  order_id: number;
  order_number: string;
  provider: PaymentMethod;
  provider_ref: string | null;
  amount: number;
  status: PaymentStatus;
  captured_at: string | null;
  created_at: string;
};

export type Refund = {
  id: number;
  payment_id: number;
  order_id: number;
  order_number: string;
  amount: number;
  reason: string;
  status: "pending" | "processed" | "rejected";
  created_at: string;
};

/* ------------------------------------------------------------------ */
/* Shipments (VL-024 - VL-026)                                         */
/* ------------------------------------------------------------------ */

export type ShipmentStatus =
  | "pending"
  | "scheduled"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "exception";

export type ShipmentEvent = {
  id: number;
  shipment_id: number;
  status: string;
  description: string;
  location: string | null;
  occurred_at: string;
};

export type Shipment = {
  id: number;
  order_id: number;
  order_number: string;
  carrier: string;
  tracking_number: string;
  status: ShipmentStatus;
  exception_flag: boolean;
  exception_reason: string | null;
  pickup_scheduled_at: string | null;
  estimated_delivery: string | null;
  events: ShipmentEvent[];
  created_at: string;
  updated_at: string;
};

export type CreateShipmentInput = {
  order_id: number;
  carrier: string;
  tracking_number?: string;
  estimated_delivery?: string | null;
};

export type ShipmentEventInput = {
  status: string;
  description: string;
  location?: string | null;
};

/* ------------------------------------------------------------------ */
/* Notifications (VL-027)                                              */
/* ------------------------------------------------------------------ */

export type NotificationChannel = "email" | "sms" | "push";

export type NotificationItem = {
  id: number;
  channel: NotificationChannel;
  event: string;
  recipient: string;
  subject: string;
  message: string;
  status: "sent" | "failed" | "queued";
  sent_at: string | null;
  created_at: string;
};

export type SendTestNotificationInput = {
  channel: NotificationChannel;
  event: string;
  recipient: string;
  subject: string;
  message: string;
};

/* ------------------------------------------------------------------ */
/* Reports (VL-028 / VL-029)                                           */
/* ------------------------------------------------------------------ */

export type ReportSummary = {
  id: number;
  period: string;
  total_orders: number;
  total_revenue: number;
  total_refunds: number;
  avg_order_value: number;
  new_customers: number;
  low_stock_items: number;
  pending_shipments: number;
  generated_at: string;
};
