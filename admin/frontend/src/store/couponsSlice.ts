import { createAsyncThunk, createSlice, isAnyOf } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api";
import type { Coupon, CouponInput } from "@/lib/types";
import { isDemoMockForced, mockCoupons, resolveDemoData } from "@/mock";

type StateWithAuth = { auth: { token: string | null } };

type CouponsState = {
  items: Coupon[];
  loading: boolean;
  error: string | null;
};

const initialState: CouponsState = {
  items: [],
  loading: false,
  error: null,
};

let mockItems: Coupon[] = mockCoupons.map((item) => ({ ...item }));
let nextMockId = Math.max(0, ...mockItems.map((item) => item.id)) + 1;

export const fetchCoupons = createAsyncThunk<
  Coupon[],
  void,
  { state: StateWithAuth }
>("coupons/fetch", async (_, { getState }) => {
  if (isDemoMockForced()) return mockItems.map((item) => ({ ...item }));
  try {
    const data = await apiRequest<Coupon[]>(
      "/coupons",
      {},
      getState().auth.token,
    );
    return resolveDemoData(data, mockCoupons);
  } catch {
    return resolveDemoData([], mockCoupons);
  }
});

export const createCoupon = createAsyncThunk<
  Coupon,
  CouponInput,
  { state: StateWithAuth }
>("coupons/create", async (payload, { getState }) => {
  if (isDemoMockForced()) {
    const now = new Date().toISOString();
    const row: Coupon = {
      id: nextMockId++,
      code: payload.code.toUpperCase(),
      name: payload.name,
      discount_type: payload.discount_type,
      discount_value: payload.discount_value,
      min_order_amount: payload.min_order_amount ?? null,
      max_uses: payload.max_uses ?? null,
      used_count: 0,
      starts_at: payload.starts_at ?? null,
      ends_at: payload.ends_at ?? null,
      is_active: payload.is_active ?? true,
      created_at: now,
      updated_at: now,
    };
    mockItems = [row, ...mockItems];
    return row;
  }
  return apiRequest<Coupon>(
    "/coupons",
    { method: "POST", body: JSON.stringify(payload) },
    getState().auth.token,
  );
});

export const updateCoupon = createAsyncThunk<
  Coupon,
  { id: number; changes: CouponInput },
  { state: StateWithAuth }
>("coupons/update", async ({ id, changes }, { getState }) => {
  if (isDemoMockForced()) {
    const index = mockItems.findIndex((item) => item.id === id);
    if (index < 0) throw new Error("Coupon not found");
    const updated: Coupon = {
      ...mockItems[index],
      ...changes,
      code: changes.code.toUpperCase(),
      updated_at: new Date().toISOString(),
    };
    mockItems = mockItems.map((item) => (item.id === id ? updated : item));
    return updated;
  }
  return apiRequest<Coupon>(
    `/coupons/${id}`,
    { method: "PATCH", body: JSON.stringify(changes) },
    getState().auth.token,
  );
});

export const deleteCoupon = createAsyncThunk<
  number,
  number,
  { state: StateWithAuth }
>("coupons/delete", async (id, { getState }) => {
  if (isDemoMockForced()) {
    mockItems = mockItems.filter((item) => item.id !== id);
    return id;
  }
  await apiRequest<void>(
    `/coupons/${id}`,
    { method: "DELETE" },
    getState().auth.token,
  );
  return id;
});

const couponsSlice = createSlice({
  name: "coupons",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCoupons.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCoupons.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(createCoupon.fulfilled, (state, action) => {
        const exists = state.items.some((item) => item.id === action.payload.id);
        if (!exists) state.items.unshift(action.payload);
      })
      .addCase(updateCoupon.fulfilled, (state, action) => {
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index >= 0) state.items[index] = action.payload;
      })
      .addCase(deleteCoupon.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.id !== action.payload);
      })
      .addMatcher(
        isAnyOf(
          fetchCoupons.rejected,
          createCoupon.rejected,
          updateCoupon.rejected,
          deleteCoupon.rejected,
        ),
        (state, action) => {
          state.loading = false;
          state.error = action.error?.message ?? "Coupon request failed";
        },
      );
  },
});

export default couponsSlice.reducer;
