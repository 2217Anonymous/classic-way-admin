import { createAsyncThunk, createSlice, isAnyOf } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api";
import type { Brand, BrandInput } from "@/lib/types";
import { isDemoMockForced, mockBrands, resolveDemoData } from "@/mock";

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

let mockItems: Brand[] = mockBrands.map((item) => ({ ...item }));
let nextMockId = Math.max(0, ...mockItems.map((item) => item.id)) + 1;

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const fetchBrands = createAsyncThunk<
  Brand[],
  void,
  { state: StateWithAuth }
>("brands/fetch", async (_, { getState }) => {
  if (isDemoMockForced()) return mockItems.map((item) => ({ ...item }));
  try {
    const data = await apiRequest<Brand[]>(
      "/brands",
      {},
      getState().auth.token,
    );
    return resolveDemoData(data, mockBrands);
  } catch {
    return resolveDemoData([], mockBrands);
  }
});

export const createBrand = createAsyncThunk<
  Brand,
  BrandInput,
  { state: StateWithAuth }
>("brands/create", async (payload, { getState }) => {
  if (isDemoMockForced()) {
    const now = new Date().toISOString();
    const row: Brand = {
      id: nextMockId++,
      name: payload.name.trim(),
      slug: (payload.slug?.trim() || slugify(payload.name)) || `brand-${nextMockId}`,
      is_active: payload.is_active ?? true,
      created_at: now,
      updated_at: now,
    };
    mockItems = [row, ...mockItems];
    return row;
  }
  return apiRequest<Brand>(
    "/brands",
    { method: "POST", body: JSON.stringify(payload) },
    getState().auth.token,
  );
});

export const updateBrand = createAsyncThunk<
  Brand,
  { id: number; changes: BrandInput },
  { state: StateWithAuth }
>("brands/update", async ({ id, changes }, { getState }) => {
  if (isDemoMockForced()) {
    const index = mockItems.findIndex((item) => item.id === id);
    if (index < 0) throw new Error("Brand not found");
    const updated: Brand = {
      ...mockItems[index],
      name: changes.name.trim(),
      slug:
        (changes.slug?.trim() || slugify(changes.name)) ||
        mockItems[index].slug,
      is_active: changes.is_active ?? mockItems[index].is_active,
      updated_at: new Date().toISOString(),
    };
    mockItems = mockItems.map((item) => (item.id === id ? updated : item));
    return updated;
  }
  return apiRequest<Brand>(
    `/brands/${id}`,
    { method: "PATCH", body: JSON.stringify(changes) },
    getState().auth.token,
  );
});

export const deleteBrand = createAsyncThunk<
  number,
  number,
  { state: StateWithAuth }
>("brands/delete", async (id, { getState }) => {
  if (isDemoMockForced()) {
    mockItems = mockItems.filter((item) => item.id !== id);
    return id;
  }
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
