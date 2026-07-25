import { createAsyncThunk, createSlice, isAnyOf } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api";
import type {
  InventoryItem,
  InventorySettings,
  InventorySettingsInput,
} from "@/lib/types";

type StateWithAuth = { auth: { token: string | null } };

type InventoryState = {
  items: InventoryItem[];
  settings: InventorySettings;
  loading: boolean;
  error: string | null;
};

const initialSettings: InventorySettings = {
  id: "",
  default_low_stock_threshold: 10,
  backorders_allowed: false,
  updated_at: "",
};

const initialState: InventoryState = {
  items: [],
  settings: initialSettings,
  loading: false,
  error: null,
};

export const fetchInventory = createAsyncThunk<
  InventoryItem[],
  void,
  { state: StateWithAuth }
>("inventory/fetch", async (_, { getState }) => {
  return apiRequest<InventoryItem[]>(
    "/inventory",
    {},
    getState().auth.token,
  );
});

export const adjustStock = createAsyncThunk<
  InventoryItem,
  { id: string; delta: number; reason: string },
  { state: StateWithAuth }
>("inventory/adjustStock", async ({ id, delta, reason }, { getState }) => {
  return apiRequest<InventoryItem>(
    `/inventory/${id}/adjust`,
    { method: "POST", body: JSON.stringify({ delta, reason }) },
    getState().auth.token,
  );
});

export const updateLowStockThreshold = createAsyncThunk<
  InventoryItem,
  { id: string; threshold: number },
  { state: StateWithAuth }
>("inventory/updateThreshold", async ({ id, threshold }, { getState }) => {
  return apiRequest<InventoryItem>(
    `/inventory/${id}`,
    { method: "PATCH", body: JSON.stringify({ low_stock_threshold: threshold }) },
    getState().auth.token,
  );
});

export const updateInventorySettings = createAsyncThunk<
  InventorySettings,
  InventorySettingsInput,
  { state: StateWithAuth }
>("inventory/updateSettings", async (payload, { getState }) => {
  return apiRequest<InventorySettings>(
    "/inventory/settings",
    { method: "PATCH", body: JSON.stringify(payload) },
    getState().auth.token,
  );
});

const inventorySlice = createSlice({
  name: "inventory",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchInventory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInventory.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(adjustStock.fulfilled, (state, action) => {
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index >= 0) state.items[index] = action.payload;
      })
      .addCase(updateLowStockThreshold.fulfilled, (state, action) => {
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index >= 0) state.items[index] = action.payload;
      })
      .addCase(updateInventorySettings.fulfilled, (state, action) => {
        state.settings = action.payload;
      })
      .addMatcher(
        isAnyOf(
          fetchInventory.rejected,
          adjustStock.rejected,
          updateLowStockThreshold.rejected,
          updateInventorySettings.rejected,
        ),
        (state, action) => {
          state.loading = false;
          state.error = action.error?.message ?? "Inventory request failed";
        },
      );
  },
});

export default inventorySlice.reducer;
