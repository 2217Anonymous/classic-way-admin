import { createAsyncThunk, createSlice, isAnyOf } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api";
import type { AdminCustomer } from "@/lib/types";

type StateWithAuth = { auth: { token: string | null } };

type CustomersState = {
  items: AdminCustomer[];
  selected: AdminCustomer | null;
  loading: boolean;
  error: string | null;
};

const initialState: CustomersState = {
  items: [],
  selected: null,
  loading: false,
  error: null,
};

export const fetchCustomers = createAsyncThunk<
  AdminCustomer[],
  void,
  { state: StateWithAuth }
>("customers/fetch", async (_, { getState }) => {
  return apiRequest<AdminCustomer[]>(
    "/admin/customers",
    {},
    getState().auth.token,
  );
});

export const fetchCustomer = createAsyncThunk<
  AdminCustomer,
  string,
  { state: StateWithAuth }
>("customers/fetchOne", async (id, { getState }) => {
  return apiRequest<AdminCustomer>(
    `/admin/customers/${id}`,
    {},
    getState().auth.token,
  );
});

export const updateCustomerStatus = createAsyncThunk<
  AdminCustomer,
  { id: string; is_active: boolean },
  { state: StateWithAuth }
>("customers/updateStatus", async ({ id, is_active }, { getState }) => {
  return apiRequest<AdminCustomer>(
    `/admin/customers/${id}/status`,
    { method: "PATCH", body: JSON.stringify({ is_active }) },
    getState().auth.token,
  );
});

const customersSlice = createSlice({
  name: "customers",
  initialState,
  reducers: {
    clearSelectedCustomer(state) {
      state.selected = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchCustomer.fulfilled, (state, action) => {
        state.selected = action.payload;
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index >= 0) state.items[index] = action.payload;
      })
      .addCase(updateCustomerStatus.fulfilled, (state, action) => {
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index >= 0) state.items[index] = action.payload;
        if (state.selected?.id === action.payload.id) {
          state.selected = action.payload;
        }
      })
      .addMatcher(
        isAnyOf(
          fetchCustomers.rejected,
          fetchCustomer.rejected,
          updateCustomerStatus.rejected,
        ),
        (state, action) => {
          state.loading = false;
          state.error = action.error?.message ?? "Customer request failed";
        },
      );
  },
});

export const { clearSelectedCustomer } = customersSlice.actions;
export default customersSlice.reducer;
