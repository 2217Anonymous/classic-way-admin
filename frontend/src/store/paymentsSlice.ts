import { createAsyncThunk, createSlice, isAnyOf } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api";
import type { Payment, Refund } from "@/lib/types";

type StateWithAuth = { auth: { token: string | null } };

type PaymentsState = {
  items: Payment[];
  refunds: Refund[];
  loading: boolean;
  error: string | null;
};

const initialState: PaymentsState = {
  items: [],
  refunds: [],
  loading: false,
  error: null,
};

export const fetchPayments = createAsyncThunk<
  Payment[],
  void,
  { state: StateWithAuth }
>("payments/fetch", async (_, { getState }) => {
  return apiRequest<Payment[]>("/payments", {}, getState().auth.token);
});

export const fetchRefunds = createAsyncThunk<
  Refund[],
  void,
  { state: StateWithAuth }
>("payments/fetchRefunds", async (_, { getState }) => {
  return apiRequest<Refund[]>("/refunds", {}, getState().auth.token);
});

export const markPaymentPaidForOrder = createAsyncThunk<
  Payment,
  { orderId: string; orderNumber: string; amount: number; provider: Payment["provider"] },
  { state: StateWithAuth }
>("payments/markPaid", async ({ orderId }, { getState }) => {
  return apiRequest<Payment>(
    `/orders/${orderId}/payments/mark-paid`,
    { method: "POST" },
    getState().auth.token,
  );
});

export const createRefundForOrder = createAsyncThunk<
  Refund,
  { orderId: string; orderNumber: string; amount: number; reason: string },
  { state: StateWithAuth }
>("payments/createRefund", async ({ orderId, amount, reason }, { getState }) => {
  return apiRequest<Refund>(
    `/orders/${orderId}/refunds`,
    { method: "POST", body: JSON.stringify({ amount, reason }) },
    getState().auth.token,
  );
});

const paymentsSlice = createSlice({
  name: "payments",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPayments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPayments.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchRefunds.fulfilled, (state, action) => {
        state.refunds = action.payload;
      })
      .addCase(markPaymentPaidForOrder.fulfilled, (state, action) => {
        const index = state.items.findIndex((item) => item.order_id === action.payload.order_id);
        if (index >= 0) state.items[index] = action.payload;
        else state.items.unshift(action.payload);
      })
      .addCase(createRefundForOrder.fulfilled, (state, action) => {
        state.refunds.unshift(action.payload);
      })
      .addMatcher(
        isAnyOf(
          fetchPayments.rejected,
          fetchRefunds.rejected,
          markPaymentPaidForOrder.rejected,
          createRefundForOrder.rejected,
        ),
        (state, action) => {
          state.loading = false;
          state.error = action.error?.message ?? "Payment request failed";
        },
      );
  },
});

export default paymentsSlice.reducer;
