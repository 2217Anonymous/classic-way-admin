import { createAsyncThunk, createSlice, isAnyOf } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api";
import type { Coupon, CouponInput } from "@/lib/types";

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

export const fetchCoupons = createAsyncThunk<
  Coupon[],
  void,
  { state: StateWithAuth }
>("coupons/fetch", async (_, { getState }) => {
  return apiRequest<Coupon[]>("/coupons", {}, getState().auth.token);
});

export const createCoupon = createAsyncThunk<
  Coupon,
  CouponInput,
  { state: StateWithAuth }
>("coupons/create", async (payload, { getState }) => {
  return apiRequest<Coupon>(
    "/coupons",
    { method: "POST", body: JSON.stringify(payload) },
    getState().auth.token,
  );
});

export const updateCoupon = createAsyncThunk<
  Coupon,
  { id: string; changes: CouponInput },
  { state: StateWithAuth }
>("coupons/update", async ({ id, changes }, { getState }) => {
  return apiRequest<Coupon>(
    `/coupons/${id}`,
    { method: "PATCH", body: JSON.stringify(changes) },
    getState().auth.token,
  );
});

export const deleteCoupon = createAsyncThunk<
  string,
  string,
  { state: StateWithAuth }
>("coupons/delete", async (id, { getState }) => {
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
