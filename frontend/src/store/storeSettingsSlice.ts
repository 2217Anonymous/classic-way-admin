import { createAsyncThunk, createSlice, isAnyOf } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api";
import type { StoreSettings, StoreSettingsInput } from "@/lib/types";
import { isDemoMockForced, mockStoreSettings } from "@/mock";

type StateWithAuth = { auth: { token: string | null } };

type StoreSettingsState = {
  item: StoreSettings | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
};

const initialState: StoreSettingsState = {
  item: null,
  loading: false,
  saving: false,
  error: null,
};

let mockDraft: StoreSettings = { ...mockStoreSettings };

export const fetchStoreSettings = createAsyncThunk<
  StoreSettings,
  void,
  { state: StateWithAuth }
>("storeSettings/fetch", async (_, { getState }) => {
  if (isDemoMockForced()) return { ...mockDraft };
  try {
    return await apiRequest<StoreSettings>(
      "/store-settings",
      {},
      getState().auth.token,
    );
  } catch {
    return { ...mockDraft };
  }
});

export const updateStoreSettings = createAsyncThunk<
  StoreSettings,
  StoreSettingsInput,
  { state: StateWithAuth }
>("storeSettings/update", async (payload, { getState }) => {
  if (isDemoMockForced()) {
    mockDraft = {
      ...mockDraft,
      ...payload,
      store_name: payload.store_name,
      updated_at: new Date().toISOString(),
    };
    return { ...mockDraft };
  }
  return apiRequest<StoreSettings>(
    "/store-settings",
    { method: "PUT", body: JSON.stringify(payload) },
    getState().auth.token,
  );
});

const storeSettingsSlice = createSlice({
  name: "storeSettings",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStoreSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStoreSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.item = action.payload;
      })
      .addCase(updateStoreSettings.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateStoreSettings.fulfilled, (state, action) => {
        state.saving = false;
        state.item = action.payload;
      })
      .addMatcher(
        isAnyOf(fetchStoreSettings.rejected, updateStoreSettings.rejected),
        (state, action) => {
          state.loading = false;
          state.saving = false;
          state.error = action.error?.message ?? "Store settings request failed";
        },
      );
  },
});

export default storeSettingsSlice.reducer;
