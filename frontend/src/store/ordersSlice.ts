import { createAsyncThunk, createSlice, isAnyOf } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api";
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

export const fetchOrders = createAsyncThunk<
  Order[],
  void,
  { state: StateWithAuth }
>("orders/fetch", async (_, { getState }) => {
  return apiRequest<Order[]>("/orders", {}, getState().auth.token);
});

export const fetchOrderByNumber = createAsyncThunk<
  Order,
  string,
  { state: StateWithAuth }
>("orders/fetchByNumber", async (orderNumber, { getState }) => {
  const normalized = orderNumber.trim().toUpperCase();
  return apiRequest<Order>(
    `/orders/by-number/${normalized}`,
    {},
    getState().auth.token,
  );
});

export const createOrder = createAsyncThunk<
  Order,
  CreateOrderInput,
  { state: StateWithAuth }
>("orders/create", async (payload, { getState }) => {
  return apiRequest<Order>(
    "/orders",
    { method: "POST", body: JSON.stringify(payload) },
    getState().auth.token,
  );
});

export const updateOrderStatus = createAsyncThunk<
  Order,
  { id: string; status: OrderStatus },
  { state: StateWithAuth }
>("orders/updateStatus", async ({ id, status }, { getState }) => {
  return apiRequest<Order>(
    `/orders/${id}/status`,
    { method: "PATCH", body: JSON.stringify({ status }) },
    getState().auth.token,
  );
});

export const markOrderPaid = createAsyncThunk<
  Order,
  string,
  { state: StateWithAuth }
>("orders/markPaid", async (id, { getState }) => {
  return apiRequest<Order>(
    `/orders/${id}/mark-paid`,
    { method: "POST" },
    getState().auth.token,
  );
});

export const cancelOrder = createAsyncThunk<
  Order,
  { id: string; reason?: string },
  { state: StateWithAuth }
>("orders/cancel", async ({ id, reason }, { getState }) => {
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
