import { createAsyncThunk, createSlice, isAnyOf } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api";
import type { Payment, Refund } from "@/lib/types";
import { isDemoMockForced, mockPayments, mockRefunds, resolveDemoData } from "@/mock";

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

let mockItems: Payment[] = mockPayments.map((item) => ({ ...item }));
let mockRefundItems: Refund[] = mockRefunds.map((item) => ({ ...item }));
let nextRefundId = Math.max(0, ...mockRefundItems.map((item) => item.id)) + 1;

export const fetchPayments = createAsyncThunk<
  Payment[],
  void,
  { state: StateWithAuth }
>("payments/fetch", async (_, { getState }) => {
  if (isDemoMockForced()) return mockItems.map((item) => ({ ...item }));
  try {
    const data = await apiRequest<Payment[]>("/payments", {}, getState().auth.token);
    return resolveDemoData(data, mockPayments);
  } catch {
    return resolveDemoData([], mockPayments);
  }
});

export const fetchRefunds = createAsyncThunk<
  Refund[],
  void,
  { state: StateWithAuth }
>("payments/fetchRefunds", async (_, { getState }) => {
  if (isDemoMockForced()) return mockRefundItems.map((item) => ({ ...item }));
  try {
    const data = await apiRequest<Refund[]>("/refunds", {}, getState().auth.token);
    return resolveDemoData(data, mockRefunds);
  } catch {
    return resolveDemoData([], mockRefunds);
  }
});

export const markPaymentPaidForOrder = createAsyncThunk<
  Payment,
  { orderId: number; orderNumber: string; amount: number; provider: Payment["provider"] },
  { state: StateWithAuth }
>("payments/markPaid", async ({ orderId, orderNumber, amount, provider }, { getState }) => {
  if (isDemoMockForced()) {
    const now = new Date().toISOString();
    const existingIndex = mockItems.findIndex((item) => item.order_id === orderId);
    const updated: Payment = {
      id: existingIndex >= 0 ? mockItems[existingIndex].id : Math.max(0, ...mockItems.map((i) => i.id)) + 1,
      order_id: orderId,
      order_number: orderNumber,
      provider,
      provider_ref: existingIndex >= 0 ? mockItems[existingIndex].provider_ref : null,
      amount,
      status: "paid",
      captured_at: now,
      created_at: existingIndex >= 0 ? mockItems[existingIndex].created_at : now,
    };
    mockItems =
      existingIndex >= 0
        ? mockItems.map((item, i) => (i === existingIndex ? updated : item))
        : [updated, ...mockItems];
    return updated;
  }
  return apiRequest<Payment>(
    `/orders/${orderId}/payments/mark-paid`,
    { method: "POST" },
    getState().auth.token,
  );
});

export const createRefundForOrder = createAsyncThunk<
  Refund,
  { orderId: number; orderNumber: string; amount: number; reason: string },
  { state: StateWithAuth }
>("payments/createRefund", async ({ orderId, orderNumber, amount, reason }, { getState }) => {
  if (isDemoMockForced()) {
    const refund: Refund = {
      id: nextRefundId++,
      payment_id: orderId,
      order_id: orderId,
      order_number: orderNumber,
      amount,
      reason,
      status: "processed",
      created_at: new Date().toISOString(),
    };
    mockRefundItems = [refund, ...mockRefundItems];
    return refund;
  }
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
