import { createAsyncThunk, createSlice, isAnyOf } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api";
import type { TaxRule, TaxRuleInput } from "@/lib/types";
import { isDemoMockForced, mockTaxRules, resolveDemoData } from "@/mock";

type StateWithAuth = { auth: { token: string | null } };

type TaxState = {
  items: TaxRule[];
  loading: boolean;
  error: string | null;
};

const initialState: TaxState = {
  items: [],
  loading: false,
  error: null,
};

let mockItems: TaxRule[] = mockTaxRules.map((item) => ({ ...item }));
let nextMockId = Math.max(0, ...mockItems.map((item) => item.id)) + 1;

export const fetchTaxRules = createAsyncThunk<
  TaxRule[],
  void,
  { state: StateWithAuth }
>("tax/fetch", async (_, { getState }) => {
  if (isDemoMockForced()) return mockItems.map((item) => ({ ...item }));
  try {
    const data = await apiRequest<TaxRule[]>(
      "/tax-rules",
      {},
      getState().auth.token,
    );
    return resolveDemoData(data, mockTaxRules);
  } catch {
    return resolveDemoData([], mockTaxRules);
  }
});

export const createTaxRule = createAsyncThunk<
  TaxRule,
  TaxRuleInput,
  { state: StateWithAuth }
>("tax/create", async (payload, { getState }) => {
  if (isDemoMockForced()) {
    const now = new Date().toISOString();
    const row: TaxRule = {
      id: nextMockId++,
      name: payload.name,
      code: payload.code.toUpperCase(),
      rate_percent: payload.rate_percent,
      is_inclusive: payload.is_inclusive ?? false,
      country: payload.country ?? null,
      state: payload.state ?? null,
      is_active: payload.is_active ?? true,
      sort_order: payload.sort_order ?? 0,
      created_at: now,
      updated_at: now,
    };
    mockItems = [row, ...mockItems];
    return row;
  }
  return apiRequest<TaxRule>(
    "/tax-rules",
    { method: "POST", body: JSON.stringify(payload) },
    getState().auth.token,
  );
});

export const updateTaxRule = createAsyncThunk<
  TaxRule,
  { id: number; changes: TaxRuleInput },
  { state: StateWithAuth }
>("tax/update", async ({ id, changes }, { getState }) => {
  if (isDemoMockForced()) {
    const index = mockItems.findIndex((item) => item.id === id);
    if (index < 0) throw new Error("Tax rule not found");
    const updated: TaxRule = {
      ...mockItems[index],
      ...changes,
      code: changes.code.toUpperCase(),
      updated_at: new Date().toISOString(),
    };
    mockItems = mockItems.map((item) => (item.id === id ? updated : item));
    return updated;
  }
  return apiRequest<TaxRule>(
    `/tax-rules/${id}`,
    { method: "PATCH", body: JSON.stringify(changes) },
    getState().auth.token,
  );
});

export const deleteTaxRule = createAsyncThunk<
  number,
  number,
  { state: StateWithAuth }
>("tax/delete", async (id, { getState }) => {
  if (isDemoMockForced()) {
    mockItems = mockItems.filter((item) => item.id !== id);
    return id;
  }
  await apiRequest<void>(
    `/tax-rules/${id}`,
    { method: "DELETE" },
    getState().auth.token,
  );
  return id;
});

const taxSlice = createSlice({
  name: "tax",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTaxRules.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTaxRules.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(createTaxRule.fulfilled, (state, action) => {
        const exists = state.items.some((item) => item.id === action.payload.id);
        if (!exists) state.items.unshift(action.payload);
      })
      .addCase(updateTaxRule.fulfilled, (state, action) => {
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index >= 0) state.items[index] = action.payload;
      })
      .addCase(deleteTaxRule.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.id !== action.payload);
      })
      .addMatcher(
        isAnyOf(
          fetchTaxRules.rejected,
          createTaxRule.rejected,
          updateTaxRule.rejected,
          deleteTaxRule.rejected,
        ),
        (state, action) => {
          state.loading = false;
          state.error = action.error?.message ?? "Tax request failed";
        },
      );
  },
});

export default taxSlice.reducer;
