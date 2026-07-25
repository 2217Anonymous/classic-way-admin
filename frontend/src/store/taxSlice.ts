import { createAsyncThunk, createSlice, isAnyOf } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api";
import type { TaxRule, TaxRuleInput } from "@/lib/types";

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

export const fetchTaxRules = createAsyncThunk<
  TaxRule[],
  void,
  { state: StateWithAuth }
>("tax/fetch", async (_, { getState }) => {
  return apiRequest<TaxRule[]>("/tax-rules", {}, getState().auth.token);
});

export const createTaxRule = createAsyncThunk<
  TaxRule,
  TaxRuleInput,
  { state: StateWithAuth }
>("tax/create", async (payload, { getState }) => {
  return apiRequest<TaxRule>(
    "/tax-rules",
    { method: "POST", body: JSON.stringify(payload) },
    getState().auth.token,
  );
});

export const updateTaxRule = createAsyncThunk<
  TaxRule,
  { id: string; changes: TaxRuleInput },
  { state: StateWithAuth }
>("tax/update", async ({ id, changes }, { getState }) => {
  return apiRequest<TaxRule>(
    `/tax-rules/${id}`,
    { method: "PATCH", body: JSON.stringify(changes) },
    getState().auth.token,
  );
});

export const deleteTaxRule = createAsyncThunk<
  string,
  string,
  { state: StateWithAuth }
>("tax/delete", async (id, { getState }) => {
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
