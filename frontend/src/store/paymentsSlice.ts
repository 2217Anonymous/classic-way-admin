import { createAsyncThunk, createSlice, isAnyOf } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api";
import type { Order, Payment, Refund } from "@/lib/types";

type StateWithAuth = {
  auth: { token: string | null };
  orders: { items: Order[] };
};

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

function mapPayment(raw: Record<string, unknown>, orders: Order[]): Payment {
  const orderId = String(raw.order_id ?? "");
  const order = orders.find((row) => row.id === orderId);
  const status = String(raw.status ?? "pending");
  const providerRaw = String(raw.provider ?? raw.method ?? "cod");
  const provider = providerRaw === "razorpay" ? "razorpay" : "cod";
  return {
    id: String(raw.id),
    order_id: orderId,
    order_number: order?.order_number ?? String(raw.order_number ?? "—"),
    provider,
    provider_ref:
      raw.provider_payment_id == null && raw.provider_order_id == null
        ? null
        : String(raw.provider_payment_id ?? raw.provider_order_id),
    amount: Number(raw.amount ?? 0),
    status:
      status === "captured" || status === "paid"
        ? "paid"
        : status === "refunded"
          ? "refunded"
          : status === "failed"
            ? "failed"
            : "pending",
    captured_at:
      status === "captured" || status === "paid"
        ? String(raw.updated_at ?? raw.created_at)
        : null,
    created_at: String(raw.created_at ?? ""),
  };
}

function mapRefund(raw: Record<string, unknown>, orders: Order[]): Refund {
  const orderId = String(raw.order_id ?? "");
  const order = orders.find((row) => row.id === orderId);
  const status = String(raw.status ?? "pending");
  return {
    id: String(raw.id),
    payment_id: String(raw.payment_id ?? ""),
    order_id: orderId,
    order_number: order?.order_number ?? "—",
    amount: Number(raw.amount ?? 0),
    reason: String(raw.reason ?? ""),
    status:
      status === "processed" || status === "completed"
        ? "processed"
        : status === "rejected"
          ? "rejected"
          : "pending",
    created_at: String(raw.created_at ?? ""),
  };
}

export const fetchPayments = createAsyncThunk<
  Payment[],
  void,
  { state: StateWithAuth }
>("payments/fetch", async (_, { getState }) => {
  const state = getState();
  const rows = await apiRequest<Record<string, unknown>[]>(
    "/payments",
    {},
    state.auth.token,
  );
  return rows.map((row) => mapPayment(row, state.orders.items));
});

export const fetchRefunds = createAsyncThunk<
  Refund[],
  void,
  { state: StateWithAuth }
>("payments/fetchRefunds", async (_, { getState }) => {
  const state = getState();
  const rows = await apiRequest<Record<string, unknown>[]>(
    "/payments/refunds",
    {},
    state.auth.token,
  );
  return rows.map((row) => mapRefund(row, state.orders.items));
});

export const markPaymentPaidForOrder = createAsyncThunk<
  Payment,
  { orderId: string; orderNumber: string; amount: number; provider: Payment["provider"] },
  { state: StateWithAuth }
>("payments/markPaid", async ({ orderId }, { getState, dispatch }) => {
  const state = getState();
  await apiRequest<unknown>(
    `/orders/${orderId}/mark-paid`,
    { method: "POST" },
    state.auth.token,
  );
  const payments = await dispatch(fetchPayments()).unwrap();
  const payment = payments.find((row) => row.order_id === orderId);
  if (!payment) {
    throw new Error("Payment record not found after mark-paid");
  }
  return payment;
});

export const createRefundForOrder = createAsyncThunk<
  Refund,
  { orderId: string; orderNumber: string; amount: number; reason: string },
  { state: StateWithAuth }
>("payments/createRefund", async ({ orderId, amount, reason }, { getState }) => {
  const state = getState();
  const payments = await apiRequest<Record<string, unknown>[]>(
    "/payments",
    {},
    state.auth.token,
  );
  const payment = payments.find((row) => String(row.order_id) === orderId);
  if (!payment) {
    throw new Error("No payment found for this order");
  }
  const row = await apiRequest<Record<string, unknown>>(
    `/payments/${payment.id}/refund`,
    { method: "POST", body: JSON.stringify({ amount, reason }) },
    state.auth.token,
  );
  return mapRefund(row, state.orders.items);
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
