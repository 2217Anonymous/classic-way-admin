import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api";
import type { LoginResponse, User } from "@/lib/types";

type AuthState = {
  token: string | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  hydrated: boolean;
};

const initialState: AuthState = {
  token: null,
  user: null,
  loading: false,
  error: null,
  hydrated: false,
};

export const login = createAsyncThunk(
  "auth/login",
  async ({ email, password }: { email: string; password: string }) => {
    const body = new URLSearchParams({ username: email, password });
    const response = await apiRequest<LoginResponse>("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    localStorage.setItem("admin_token", response.access_token);
    localStorage.setItem("admin_user", JSON.stringify(response.user));
    return response;
  },
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    hydrateAuth(
      state,
      action: PayloadAction<{ token: string | null; user: User | null }>,
    ) {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.hydrated = true;
    },
    logout(state) {
      state.token = null;
      state.user = null;
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_user");
    },
    setCurrentUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
      localStorage.setItem("admin_user", JSON.stringify(action.payload));
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.access_token;
        state.user = action.payload.user;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Login failed";
      });
  },
});

export const { hydrateAuth, logout, setCurrentUser } = authSlice.actions;
export default authSlice.reducer;
