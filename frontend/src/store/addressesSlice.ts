import { createAsyncThunk, createSlice, isAnyOf } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api";
import type { CustomerAddress, CustomerAddressInput } from "@/lib/types";
import { isDemoMockForced, mockAddresses, resolveDemoData } from "@/mock";

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

let mockItems: CustomerAddress[] = mockAddresses.map((item) => ({ ...item }));
let nextMockId = Math.max(0, ...mockItems.map((item) => item.id)) + 1;

export const fetchAddresses = createAsyncThunk<
  CustomerAddress[],
  void,
  { state: StateWithAuth }
>("addresses/fetch", async (_, { getState }) => {
  if (isDemoMockForced()) return mockItems.map((item) => ({ ...item }));
  try {
    const data = await apiRequest<CustomerAddress[]>(
      "/addresses",
      {},
      getState().auth.token,
    );
    return resolveDemoData(data, mockAddresses);
  } catch {
    return resolveDemoData([], mockAddresses);
  }
});

export const createAddress = createAsyncThunk<
  CustomerAddress,
  CustomerAddressInput,
  { state: StateWithAuth }
>("addresses/create", async (payload, { getState }) => {
  if (isDemoMockForced()) {
    const now = new Date().toISOString();
    const row: CustomerAddress = {
      id: nextMockId++,
      customer_id: null,
      full_name: payload.full_name,
      phone: payload.phone,
      email: payload.email ?? null,
      line1: payload.line1,
      line2: payload.line2 ?? null,
      city: payload.city,
      state: payload.state,
      postal_code: payload.postal_code,
      country: payload.country ?? "India",
      is_default: payload.is_default ?? mockItems.length === 0,
      created_at: now,
    };
    if (row.is_default) {
      mockItems = mockItems.map((item) => ({ ...item, is_default: false }));
    }
    mockItems = [row, ...mockItems];
    return row;
  }
  return apiRequest<CustomerAddress>(
    "/addresses",
    { method: "POST", body: JSON.stringify(payload) },
    getState().auth.token,
  );
});

export const updateAddress = createAsyncThunk<
  CustomerAddress,
  { id: number; changes: CustomerAddressInput },
  { state: StateWithAuth }
>("addresses/update", async ({ id, changes }, { getState }) => {
  if (isDemoMockForced()) {
    const index = mockItems.findIndex((item) => item.id === id);
    if (index < 0) throw new Error("Address not found");
    const updated: CustomerAddress = {
      ...mockItems[index],
      ...changes,
      email: changes.email ?? null,
      line2: changes.line2 ?? null,
      country: changes.country ?? mockItems[index].country,
    };
    if (changes.is_default) {
      mockItems = mockItems.map((item) => ({ ...item, is_default: false }));
    }
    mockItems = mockItems.map((item) => (item.id === id ? updated : item));
    return updated;
  }
  return apiRequest<CustomerAddress>(
    `/addresses/${id}`,
    { method: "PATCH", body: JSON.stringify(changes) },
    getState().auth.token,
  );
});

export const setDefaultAddress = createAsyncThunk<
  CustomerAddress[],
  number,
  { state: StateWithAuth }
>("addresses/setDefault", async (id, { getState }) => {
  if (isDemoMockForced()) {
    mockItems = mockItems.map((item) => ({ ...item, is_default: item.id === id }));
    return mockItems.map((item) => ({ ...item }));
  }
  await apiRequest<void>(
    `/addresses/${id}/default`,
    { method: "POST" },
    getState().auth.token,
  );
  return mockItems.map((item) => ({ ...item }));
});

export const deleteAddress = createAsyncThunk<
  number,
  number,
  { state: StateWithAuth }
>("addresses/delete", async (id, { getState }) => {
  if (isDemoMockForced()) {
    mockItems = mockItems.filter((item) => item.id !== id);
    return id;
  }
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
