export type Role = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type User = {
  id: string;
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
  role_ids: string[];
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
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
  parent_id?: string | null;
  is_active?: boolean;
  sort_order?: number;
};

export type ProductMedia = {
  id: string;
  product_id: string;
  /** Resolved large image URL (backward compatible). */
  url: string;
  large_url?: string | null;
  medium_url?: string | null;
  thumbnail_url?: string | null;
  original_filename?: string | null;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
  updated_at?: string | null;
};

export type ProductAttribute = {
  id: string;
  product_id: string;
  name: string;
  values: string[];
  sort_order: number;
  created_at: string;
};

export type ProductVariant = {
  id: string;
  product_id: string;
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
  id: string;
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
  id: string;
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
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminReview = {
  id: string;
  product_id: string;
  product_name?: string | null;
  customer_id: string;
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
  id: string;
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
  category_id: string | null;
  category_name: string | null;
  brand_id?: string | null;
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
  category_id?: string | null;
  brand_id?: string | null;
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
  id: string;
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

export type ThemePageVisibility = {
  about_us: boolean;
  contact_us: boolean;
  cart: boolean;
  checkout: boolean;
  compare: boolean;
  faq: boolean;
  login: boolean;
  register: boolean;
  wishlist: boolean;
  terms: boolean;
  track_order: boolean;
};

export type ThemeSettings = {
  id: string;
  customer_id: string | null;
  home_theme: string;
  shop_category: string;
  shop_layout: string;
  product_layout: string;
  blog_layout: string;
  page_visibility: ThemePageVisibility;
  theme_config: Record<string, unknown> | null;
  is_default: boolean;
  is_active: boolean;
  source?: string;
  created_at: string;
  updated_at: string;
};

export type ThemeSettingsInput = {
  home_theme: string;
  shop_category: string;
  shop_layout: string;
  product_layout: string;
  blog_layout: string;
  page_visibility: ThemePageVisibility;
  theme_config?: Record<string, unknown> | null;
};

export type TaxRule = {
  id: string;
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
  id: string;
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
  id: string;
  product_id: string;
  product_name: string;
  sku: string | null;
  variant_id: string | null;
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
  id: string;
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
  id: string;
  cart_id: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  variant_id: string | null;
  variant_label: string | null;
  sku: string | null;
  image_url: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
};

export type Cart = {
  id: string;
  cart_token: string;
  customer_id: string | null;
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
  id: string;
  customer_id: string | null;
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
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  variant_id: string | null;
  variant_label: string | null;
  sku: string | null;
  image_url: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
};

export type OrderStatus =
  | "draft"
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded"
  | "returned";

export type OrderStatusHistoryEntry = {
  id: string;
  order_id: string;
  from_status: string | null;
  to_status: string;
  note: string | null;
  created_at: string;
};

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type PaymentMethod = "razorpay" | "cod";

export type Order = {
  id: string;
  order_number: string;
  customer_id: string | null;
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
  status_history: OrderStatusHistoryEntry[];
  placed_at: string;
  created_at: string;
  updated_at: string;
};

export type CreateOrderInput = {
  customer_id?: string | null;
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  items: {
    product_id: string;
    product_name: string;
    product_slug?: string;
    variant_id?: string | null;
    variant_label?: string | null;
    sku?: string | null;
    image_url?: string | null;
    unit_price: number;
    quantity: number;
  }[];
  shipping_address: CustomerAddressInput;
  billing_address?: CustomerAddressInput | null;
  payment_method: PaymentMethod;
  status?: "draft" | "pending" | "paid";
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
  id: string;
  order_id: string;
  order_number: string;
  provider: PaymentMethod;
  provider_ref: string | null;
  amount: number;
  status: PaymentStatus;
  captured_at: string | null;
  created_at: string;
};

export type Refund = {
  id: string;
  payment_id: string;
  order_id: string;
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
  id: string;
  shipment_id: string;
  status: string;
  description: string;
  location: string | null;
  occurred_at: string;
};

export type Shipment = {
  id: string;
  order_id: string;
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
  order_id: string;
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
  id: string;
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
  id: string;
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
