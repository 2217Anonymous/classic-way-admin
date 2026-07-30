import { createAsyncThunk, createSlice, isAnyOf } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api";
import type { ThemeSettings, ThemeSettingsInput } from "@/lib/types";

type StateWithAuth = { auth: { token: string | null } };

type ThemeSettingsState = {
  item: ThemeSettings | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
};

const initialState: ThemeSettingsState = {
  item: null,
  loading: false,
  saving: false,
  error: null,
};

export const fetchDefaultTheme = createAsyncThunk<
  ThemeSettings,
  void,
  { state: StateWithAuth }
>("themeSettings/fetchDefault", async (_, { getState }) => {
  return apiRequest<ThemeSettings>(
    "/theme/default",
    {},
    getState().auth.token,
  );
});

export const saveDefaultTheme = createAsyncThunk<
  ThemeSettings,
  ThemeSettingsInput,
  { state: StateWithAuth }
>("themeSettings/saveDefault", async (payload, { getState }) => {
  return apiRequest<ThemeSettings>(
    "/theme/default",
    { method: "PUT", body: JSON.stringify(payload) },
    getState().auth.token,
  );
});

const themeSettingsSlice = createSlice({
  name: "themeSettings",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDefaultTheme.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDefaultTheme.fulfilled, (state, action) => {
        state.loading = false;
        state.item = action.payload;
      })
      .addCase(saveDefaultTheme.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(saveDefaultTheme.fulfilled, (state, action) => {
        state.saving = false;
        state.item = action.payload;
      })
      .addMatcher(
        isAnyOf(fetchDefaultTheme.rejected, saveDefaultTheme.rejected),
        (state, action) => {
          state.loading = false;
          state.saving = false;
          state.error =
            action.error?.message ?? "Theme settings request failed";
        },
      );
  },
});

export default themeSettingsSlice.reducer;
