import { createAsyncThunk, createSlice, isAnyOf } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api";
import type { InventoryItem, InventorySettingsInput } from "@/lib/types";
import {
  isDemoMockForced,
  mockInventoryItems,
  mockInventorySettings,
  resolveDemoData,
} from "@/mock";

type StateWithAuth = { auth: { token: string | null } };

type InventoryState = {
  items: InventoryItem[];
  settings: typeof mockInventorySettings;
  loading: boolean;
  error: string | null;
};

const initialState: InventoryState = {
  items: [],
  settings: mockInventorySettings,
  loading: false,
  error: null,
};

let mockItems: InventoryItem[] = mockInventoryItems.map((item) => ({ ...item }));
let mockSettings = { ...mockInventorySettings };

function recompute(item: InventoryItem): InventoryItem {
  const available = Math.max(0, item.stock - item.reserved);
  return {
    ...item,
    available,
    is_low_stock: available > 0 && available <= item.low_stock_threshold,
    is_out_of_stock: available <= 0,
    updated_at: new Date().toISOString(),
  };
}

export const fetchInventory = createAsyncThunk<
  InventoryItem[],
  void,
  { state: StateWithAuth }
>("inventory/fetch", async (_, { getState }) => {
  if (isDemoMockForced()) return mockItems.map((item) => ({ ...item }));
  try {
    const data = await apiRequest<InventoryItem[]>(
      "/inventory",
      {},
      getState().auth.token,
    );
    return resolveDemoData(data, mockInventoryItems);
  } catch {
    return resolveDemoData([], mockInventoryItems);
  }
});

export const adjustStock = createAsyncThunk<
  InventoryItem,
  { id: number; delta: number; reason: string },
  { state: StateWithAuth }
>("inventory/adjustStock", async ({ id, delta, reason }, { getState }) => {
  if (isDemoMockForced()) {
    const index = mockItems.findIndex((item) => item.id === id);
    if (index < 0) throw new Error("Inventory item not found");
    if (!reason.trim()) throw new Error("Reason is required");
    const updated = recompute({
      ...mockItems[index],
      stock: Math.max(0, mockItems[index].stock + delta),
    });
    mockItems = mockItems.map((item) => (item.id === id ? updated : item));
    return updated;
  }
  return apiRequest<InventoryItem>(
    `/inventory/${id}/adjust`,
    { method: "POST", body: JSON.stringify({ delta, reason }) },
    getState().auth.token,
  );
});

export const updateLowStockThreshold = createAsyncThunk<
  InventoryItem,
  { id: number; threshold: number },
  { state: StateWithAuth }
>("inventory/updateThreshold", async ({ id, threshold }, { getState }) => {
  if (isDemoMockForced()) {
    const index = mockItems.findIndex((item) => item.id === id);
    if (index < 0) throw new Error("Inventory item not found");
    const updated = recompute({
      ...mockItems[index],
      low_stock_threshold: Math.max(0, threshold),
    });
    mockItems = mockItems.map((item) => (item.id === id ? updated : item));
    return updated;
  }
  return apiRequest<InventoryItem>(
    `/inventory/${id}`,
    { method: "PATCH", body: JSON.stringify({ low_stock_threshold: threshold }) },
    getState().auth.token,
  );
});

export const updateInventorySettings = createAsyncThunk<
  typeof mockInventorySettings,
  InventorySettingsInput,
  { state: StateWithAuth }
>("inventory/updateSettings", async (payload, { getState }) => {
  if (isDemoMockForced()) {
    mockSettings = {
      ...mockSettings,
      default_low_stock_threshold: payload.default_low_stock_threshold,
      backorders_allowed: payload.backorders_allowed,
      updated_at: new Date().toISOString(),
    };
    return { ...mockSettings };
  }
  return apiRequest(
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
