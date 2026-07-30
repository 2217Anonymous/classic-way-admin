import { createAsyncThunk, createSlice, isAnyOf } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api";
import {
  normalizeInventoryItem,
  normalizeInventorySettings,
} from "@/lib/mappers";
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

function mapItem(raw: unknown, threshold: number): InventoryItem {
  return normalizeInventoryItem(raw as Record<string, unknown>, threshold);
}

function mapSettings(raw: unknown): InventorySettings {
  return normalizeInventorySettings(raw as Record<string, unknown>);
}

export const fetchInventory = createAsyncThunk<
  { items: InventoryItem[]; settings: InventorySettings },
  void,
  { state: StateWithAuth }
>("inventory/fetch", async (_, { getState }) => {
  const token = getState().auth.token;
  const [settingsRaw, itemsRaw] = await Promise.all([
    apiRequest<unknown>("/inventory/settings", {}, token),
    apiRequest<unknown[]>("/inventory/items", {}, token),
  ]);
  const settings = mapSettings(settingsRaw);
  const items = itemsRaw.map((row) =>
    mapItem(row, settings.default_low_stock_threshold),
  );
  return { items, settings };
});

export const adjustStock = createAsyncThunk<
  InventoryItem,
  { id: string; delta: number; reason: string },
  { state: StateWithAuth & { inventory: InventoryState } }
>("inventory/adjustStock", async ({ id, delta, reason }, { getState }) => {
  const state = getState();
  const row = await apiRequest<unknown>(
    `/inventory/items/${id}/adjust`,
    { method: "POST", body: JSON.stringify({ delta, reason }) },
    state.auth.token,
  );
  return mapItem(row, state.inventory.settings.default_low_stock_threshold);
});

export const updateLowStockThreshold = createAsyncThunk<
  InventoryItem,
  { id: string; threshold: number },
  { state: StateWithAuth & { inventory: InventoryState } }
>("inventory/updateThreshold", async ({ id, threshold }, { getState }) => {
  // Backend has a global threshold only; apply locally for the edited row.
  const current = getState().inventory.items.find((item) => item.id === id);
  if (!current) {
    throw new Error("Inventory item not found");
  }
  const available = current.available;
  return {
    ...current,
    low_stock_threshold: threshold,
    is_low_stock: available > 0 && available <= threshold,
    is_out_of_stock: available <= 0,
  };
});

export const updateInventorySettings = createAsyncThunk<
  InventorySettings,
  InventorySettingsInput,
  { state: StateWithAuth }
>("inventory/updateSettings", async (payload, { getState }) => {
  const row = await apiRequest<unknown>(
    "/inventory/settings",
    {
      method: "PUT",
      body: JSON.stringify({
        low_stock_threshold: payload.default_low_stock_threshold,
      }),
    },
    getState().auth.token,
  );
  const settings = mapSettings(row);
  return {
    ...settings,
    backorders_allowed: payload.backorders_allowed,
  };
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
        state.items = action.payload.items;
        state.settings = action.payload.settings;
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
        const threshold = action.payload.default_low_stock_threshold;
        state.items = state.items.map((item) => ({
          ...item,
          low_stock_threshold: threshold,
          is_low_stock: item.available > 0 && item.available <= threshold,
          is_out_of_stock: item.available <= 0,
        }));
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
