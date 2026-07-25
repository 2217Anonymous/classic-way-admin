import { createAsyncThunk, createSlice, isAnyOf } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api";
import type { Brand, BrandInput } from "@/lib/types";

type StateWithAuth = { auth: { token: string | null } };

type BrandsState = {
  items: Brand[];
  loading: boolean;
  error: string | null;
};

const initialState: BrandsState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchBrands = createAsyncThunk<
  Brand[],
  void,
  { state: StateWithAuth }
>("brands/fetch", async (_, { getState }) => {
  return apiRequest<Brand[]>("/brands", {}, getState().auth.token);
});

export const createBrand = createAsyncThunk<
  Brand,
  BrandInput,
  { state: StateWithAuth }
>("brands/create", async (payload, { getState }) => {
  return apiRequest<Brand>(
    "/brands",
    { method: "POST", body: JSON.stringify(payload) },
    getState().auth.token,
  );
});

export const updateBrand = createAsyncThunk<
  Brand,
  { id: string; changes: BrandInput },
  { state: StateWithAuth }
>("brands/update", async ({ id, changes }, { getState }) => {
  return apiRequest<Brand>(
    `/brands/${id}`,
    { method: "PATCH", body: JSON.stringify(changes) },
    getState().auth.token,
  );
});

export const deleteBrand = createAsyncThunk<
  string,
  string,
  { state: StateWithAuth }
>("brands/delete", async (id, { getState }) => {
  await apiRequest<void>(
    `/brands/${id}`,
    { method: "DELETE" },
    getState().auth.token,
  );
  return id;
});

const brandsSlice = createSlice({
  name: "brands",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBrands.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBrands.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(createBrand.fulfilled, (state, action) => {
        const exists = state.items.some((item) => item.id === action.payload.id);
        if (!exists) state.items.unshift(action.payload);
      })
      .addCase(updateBrand.fulfilled, (state, action) => {
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index >= 0) state.items[index] = action.payload;
      })
      .addCase(deleteBrand.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.id !== action.payload);
      })
      .addMatcher(
        isAnyOf(
          fetchBrands.rejected,
          createBrand.rejected,
          updateBrand.rejected,
          deleteBrand.rejected,
        ),
        (state, action) => {
          state.loading = false;
          state.error = action.error?.message ?? "Brand request failed";
        },
      );
  },
});

export default brandsSlice.reducer;
