import { createAsyncThunk, createSlice, isAnyOf } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api";
import type { CustomerAddress, CustomerAddressInput } from "@/lib/types";

type StateWithAuth = { auth: { token: string | null } };

type AddressesState = {
  items: CustomerAddress[];
  loading: boolean;
  error: string | null;
};

const initialState: AddressesState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchAddresses = createAsyncThunk<
  CustomerAddress[],
  void,
  { state: StateWithAuth }
>("addresses/fetch", async (_, { getState }) => {
  return apiRequest<CustomerAddress[]>(
    "/addresses",
    {},
    getState().auth.token,
  );
});

export const createAddress = createAsyncThunk<
  CustomerAddress,
  CustomerAddressInput,
  { state: StateWithAuth }
>("addresses/create", async (payload, { getState }) => {
  return apiRequest<CustomerAddress>(
    "/addresses",
    { method: "POST", body: JSON.stringify(payload) },
    getState().auth.token,
  );
});

export const updateAddress = createAsyncThunk<
  CustomerAddress,
  { id: string; changes: CustomerAddressInput },
  { state: StateWithAuth }
>("addresses/update", async ({ id, changes }, { getState }) => {
  return apiRequest<CustomerAddress>(
    `/addresses/${id}`,
    { method: "PATCH", body: JSON.stringify(changes) },
    getState().auth.token,
  );
});

export const setDefaultAddress = createAsyncThunk<
  CustomerAddress[],
  string,
  { state: StateWithAuth }
>("addresses/setDefault", async (id, { getState }) => {
  const token = getState().auth.token;
  await apiRequest<void>(`/addresses/${id}/default`, { method: "POST" }, token);
  return apiRequest<CustomerAddress[]>("/addresses", {}, token);
});

export const deleteAddress = createAsyncThunk<
  string,
  string,
  { state: StateWithAuth }
>("addresses/delete", async (id, { getState }) => {
  await apiRequest<void>(
    `/addresses/${id}`,
    { method: "DELETE" },
    getState().auth.token,
  );
  return id;
});

const addressesSlice = createSlice({
  name: "addresses",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAddresses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAddresses.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(createAddress.fulfilled, (state, action) => {
        if (action.payload.is_default) {
          state.items = state.items.map((item) => ({ ...item, is_default: false }));
        }
        state.items.unshift(action.payload);
      })
      .addCase(updateAddress.fulfilled, (state, action) => {
        if (action.payload.is_default) {
          state.items = state.items.map((item) => ({ ...item, is_default: false }));
        }
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index >= 0) state.items[index] = action.payload;
      })
      .addCase(setDefaultAddress.fulfilled, (state, action) => {
        state.items = action.payload;
      })
      .addCase(deleteAddress.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.id !== action.payload);
      })
      .addMatcher(
        isAnyOf(
          fetchAddresses.rejected,
          createAddress.rejected,
          updateAddress.rejected,
          setDefaultAddress.rejected,
          deleteAddress.rejected,
        ),
        (state, action) => {
          state.loading = false;
          state.error = action.error?.message ?? "Address request failed";
        },
      );
  },
});

export default addressesSlice.reducer;
