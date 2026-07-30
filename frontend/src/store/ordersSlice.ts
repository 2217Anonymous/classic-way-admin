import { createAsyncThunk, createSlice, isAnyOf } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api";
import { normalizeOrder } from "@/lib/mappers";
import type {
  CreateOrderInput,
  Order,
  OrderStatus,
} from "@/lib/types";

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

function mapOrder(raw: unknown): Order {
  return normalizeOrder(raw as Record<string, unknown>);
}

export const fetchOrders = createAsyncThunk<
  Order[],
  void,
  { state: StateWithAuth }
>("orders/fetch", async (_, { getState }) => {
  const rows = await apiRequest<unknown[]>("/orders", {}, getState().auth.token);
  return rows.map(mapOrder);
});

export const fetchOrderByNumber = createAsyncThunk<
  Order,
  string,
  { state: StateWithAuth }
>("orders/fetchByNumber", async (orderNumber, { getState }) => {
  const normalized = orderNumber.trim().toUpperCase();
  const row = await apiRequest<unknown>(
    `/orders/by-number/${normalized}`,
    {},
    getState().auth.token,
  );
  return mapOrder(row);
});

export const createOrder = createAsyncThunk<
  Order,
  CreateOrderInput,
  { state: StateWithAuth }
>("orders/create", async (payload, { getState }) => {
  const row = await apiRequest<unknown>(
    "/orders",
    {
      method: "POST",
      body: JSON.stringify({
        customer_id: payload.customer_id,
        customer_name: payload.customer_name,
        customer_email: payload.customer_email,
        customer_phone: payload.customer_phone,
        items: payload.items,
        shipping_address: payload.shipping_address,
        payment_method: payload.payment_method,
        status: payload.status ?? "pending",
        coupon_code: payload.coupon_code,
        discount_amount: payload.discount_total ?? 0,
        shipping_amount: payload.shipping_total,
        tax_amount: payload.tax_total ?? 0,
        notes: payload.notes,
      }),
    },
    getState().auth.token,
  );
  return mapOrder(row);
});

export const updateOrderStatus = createAsyncThunk<
  Order,
  { id: string; status: OrderStatus; note?: string },
  { state: StateWithAuth }
>("orders/updateStatus", async ({ id, status, note }, { getState }) => {
  const row = await apiRequest<unknown>(
    `/orders/${id}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status, note: note || undefined }),
    },
    getState().auth.token,
  );
  return mapOrder(row);
});

export const markOrderPaid = createAsyncThunk<
  Order,
  string,
  { state: StateWithAuth }
>("orders/markPaid", async (id, { getState }) => {
  const row = await apiRequest<unknown>(
    `/orders/${id}/mark-paid`,
    { method: "POST" },
    getState().auth.token,
  );
  return mapOrder(row);
});

export const cancelOrder = createAsyncThunk<
  Order,
  { id: string; reason?: string },
  { state: StateWithAuth }
>("orders/cancel", async ({ id, reason }, { getState }) => {
  const row = await apiRequest<unknown>(
    `/orders/${id}/cancel`,
    { method: "POST", body: JSON.stringify({ reason }) },
    getState().auth.token,
  );
  return mapOrder(row);
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
