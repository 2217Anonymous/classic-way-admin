import { createAsyncThunk, createSlice, isAnyOf } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api";
import type {
  CreateOrderInput,
  Order,
  OrderItem,
  OrderStatus,
} from "@/lib/types";
import { isDemoMockForced, mockOrders, resolveDemoData } from "@/mock";

type StateWithAuth = { auth: { token: string | null } };

type OrdersState = {
  items: Order[];
  loading: boolean;
  error: string | null;
  lastCreated: Order | null;
};

const initialState: OrdersState = {
  items: [],
  loading: false,
  error: null,
  lastCreated: null,
};

let mockItems: Order[] = mockOrders.map((item) => ({ ...item }));
let nextMockId = Math.max(0, ...mockItems.map((item) => item.id)) + 1;
let nextOrderSeq =
  Math.max(
    1000,
    ...mockItems.map((item) => Number(item.order_number.replace("CW-", "")) || 0),
  ) + 1;

export const fetchOrders = createAsyncThunk<
  Order[],
  void,
  { state: StateWithAuth }
>("orders/fetch", async (_, { getState }) => {
  if (isDemoMockForced()) return mockItems.map((item) => ({ ...item }));
  try {
    const data = await apiRequest<Order[]>("/orders", {}, getState().auth.token);
    return resolveDemoData(data, mockOrders);
  } catch {
    return resolveDemoData([], mockOrders);
  }
});

export const fetchOrderByNumber = createAsyncThunk<
  Order,
  string,
  { state: StateWithAuth }
>("orders/fetchByNumber", async (orderNumber, { getState, rejectWithValue }) => {
  const normalized = orderNumber.trim().toUpperCase();
  if (isDemoMockForced()) {
    const found = mockItems.find((item) => item.order_number.toUpperCase() === normalized);
    if (!found) return rejectWithValue("Order not found") as never;
    return { ...found };
  }
  try {
    return await apiRequest<Order>(
      `/orders/by-number/${normalized}`,
      {},
      getState().auth.token,
    );
  } catch {
    const found = mockItems.find((item) => item.order_number.toUpperCase() === normalized);
    if (found) return { ...found };
    return rejectWithValue("Order not found") as never;
  }
});

export const createOrder = createAsyncThunk<
  Order,
  CreateOrderInput,
  { state: StateWithAuth }
>("orders/create", async (payload, { getState }) => {
  if (isDemoMockForced()) {
    const now = new Date().toISOString();
    const orderId = nextMockId++;
    const orderNumber = `CW-${nextOrderSeq++}`;
    const items: OrderItem[] = payload.items.map((item, index) => ({
      id: orderId * 10 + index,
      order_id: orderId,
      product_id: item.product_id,
      product_name: item.product_name,
      variant_id: item.variant_id ?? null,
      variant_label: item.variant_label ?? null,
      sku: item.sku ?? null,
      image_url: item.image_url ?? null,
      unit_price: item.unit_price,
      quantity: item.quantity,
      line_total: item.unit_price * item.quantity,
    }));
    const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
    const discount_total = payload.discount_total ?? 0;
    const shipping_total = payload.shipping_total ?? (subtotal > 999 ? 0 : 60);
    const tax_total = payload.tax_total ?? Math.round(subtotal * 0.05 * 100) / 100;
    const grand_total =
      Math.round((subtotal + shipping_total + tax_total - discount_total) * 100) / 100;

    const shippingAddress = {
      id: orderId * 100,
      customer_id: null,
      full_name: payload.shipping_address.full_name,
      phone: payload.shipping_address.phone,
      email: payload.shipping_address.email ?? null,
      line1: payload.shipping_address.line1,
      line2: payload.shipping_address.line2 ?? null,
      city: payload.shipping_address.city,
      state: payload.shipping_address.state,
      postal_code: payload.shipping_address.postal_code,
      country: payload.shipping_address.country ?? "India",
      is_default: false,
      created_at: now,
    };

    const order: Order = {
      id: orderId,
      order_number: orderNumber,
      customer_id: null,
      customer_name: payload.customer_name,
      customer_email: payload.customer_email ?? null,
      customer_phone: payload.customer_phone ?? shippingAddress.phone,
      status: "pending",
      payment_status: payload.payment_method === "cod" ? "pending" : "paid",
      payment_method: payload.payment_method,
      items,
      shipping_address: shippingAddress,
      billing_address: payload.billing_address
        ? { ...shippingAddress, ...payload.billing_address, id: orderId * 100 + 1, created_at: now }
        : null,
      subtotal: Math.round(subtotal * 100) / 100,
      discount_total,
      shipping_total,
      tax_total,
      grand_total,
      coupon_code: payload.coupon_code ?? null,
      notes: payload.notes ?? null,
      placed_at: now,
      created_at: now,
      updated_at: now,
    };
    if (order.payment_method === "razorpay") {
      order.status = "paid";
    }
    mockItems = [order, ...mockItems];
    return order;
  }
  return apiRequest<Order>(
    "/orders",
    { method: "POST", body: JSON.stringify(payload) },
    getState().auth.token,
  );
});

export const updateOrderStatus = createAsyncThunk<
  Order,
  { id: number; status: OrderStatus },
  { state: StateWithAuth }
>("orders/updateStatus", async ({ id, status }, { getState }) => {
  if (isDemoMockForced()) {
    const index = mockItems.findIndex((item) => item.id === id);
    if (index < 0) throw new Error("Order not found");
    const updated: Order = {
      ...mockItems[index],
      status,
      updated_at: new Date().toISOString(),
    };
    mockItems = mockItems.map((item) => (item.id === id ? updated : item));
    return updated;
  }
  return apiRequest<Order>(
    `/orders/${id}/status`,
    { method: "PATCH", body: JSON.stringify({ status }) },
    getState().auth.token,
  );
});

export const markOrderPaid = createAsyncThunk<
  Order,
  number,
  { state: StateWithAuth }
>("orders/markPaid", async (id, { getState }) => {
  if (isDemoMockForced()) {
    const index = mockItems.findIndex((item) => item.id === id);
    if (index < 0) throw new Error("Order not found");
    const updated: Order = {
      ...mockItems[index],
      payment_status: "paid",
      status: mockItems[index].status === "pending" ? "paid" : mockItems[index].status,
      updated_at: new Date().toISOString(),
    };
    mockItems = mockItems.map((item) => (item.id === id ? updated : item));
    return updated;
  }
  return apiRequest<Order>(
    `/orders/${id}/mark-paid`,
    { method: "POST" },
    getState().auth.token,
  );
});

export const cancelOrder = createAsyncThunk<
  Order,
  { id: number; reason?: string },
  { state: StateWithAuth }
>("orders/cancel", async ({ id, reason }, { getState }) => {
  if (isDemoMockForced()) {
    const index = mockItems.findIndex((item) => item.id === id);
    if (index < 0) throw new Error("Order not found");
    const wasPaid = mockItems[index].payment_status === "paid";
    const updated: Order = {
      ...mockItems[index],
      status: "cancelled",
      payment_status: wasPaid ? "refunded" : mockItems[index].payment_status,
      notes: reason ? `Cancelled: ${reason}` : mockItems[index].notes,
      updated_at: new Date().toISOString(),
    };
    mockItems = mockItems.map((item) => (item.id === id ? updated : item));
    return updated;
  }
  return apiRequest<Order>(
    `/orders/${id}/cancel`,
    { method: "POST", body: JSON.stringify({ reason }) },
    getState().auth.token,
  );
});

const ordersSlice = createSlice({
  name: "orders",
  initialState,
  reducers: {
    clearLastCreatedOrder(state) {
      state.lastCreated = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchOrderByNumber.fulfilled, (state, action) => {
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index >= 0) state.items[index] = action.payload;
        else state.items.push(action.payload);
        state.error = null;
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        const exists = state.items.some((item) => item.id === action.payload.id);
        if (!exists) state.items.unshift(action.payload);
        state.lastCreated = action.payload;
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index >= 0) state.items[index] = action.payload;
      })
      .addCase(markOrderPaid.fulfilled, (state, action) => {
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index >= 0) state.items[index] = action.payload;
      })
      .addCase(cancelOrder.fulfilled, (state, action) => {
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index >= 0) state.items[index] = action.payload;
      })
      .addMatcher(
        isAnyOf(
          fetchOrders.rejected,
          fetchOrderByNumber.rejected,
          createOrder.rejected,
          updateOrderStatus.rejected,
          markOrderPaid.rejected,
          cancelOrder.rejected,
        ),
        (state, action) => {
          state.loading = false;
          state.error = action.error?.message ?? "Order request failed";
        },
      );
  },
});

export const { clearLastCreatedOrder } = ordersSlice.actions;
export default ordersSlice.reducer;
