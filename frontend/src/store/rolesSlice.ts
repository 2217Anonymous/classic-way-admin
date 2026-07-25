import { createAsyncThunk, createSlice, isAnyOf } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api";
import type { Role } from "@/lib/types";

type StateWithAuth = { auth: { token: string | null } };
type RolesState = { items: Role[]; loading: boolean; error: string | null };

const initialState: RolesState = { items: [], loading: false, error: null };

export const fetchRoles = createAsyncThunk<Role[], void, { state: StateWithAuth }>(
  "roles/fetch",
  async (_, { getState }) => {
    return apiRequest<Role[]>("/roles", {}, getState().auth.token);
  },
);

export const createRole = createAsyncThunk<
  Role,
  { name: string; description: string },
  { state: StateWithAuth }
>("roles/create", async (payload, { getState }) => {
  return apiRequest<Role>(
    "/roles",
    { method: "POST", body: JSON.stringify(payload) },
    getState().auth.token,
  );
});

export const deleteRole = createAsyncThunk<string, string, { state: StateWithAuth }>(
  "roles/delete",
  async (id, { getState }) => {
    await apiRequest<void>(
      `/roles/${id}`,
      { method: "DELETE" },
      getState().auth.token,
    );
    return id;
  },
);

export const updateRole = createAsyncThunk<
  Role,
  { id: string; changes: { name?: string; description?: string } },
  { state: StateWithAuth }
>("roles/update", async ({ id, changes }, { getState }) => {
  return apiRequest<Role>(
    `/roles/${id}`,
    { method: "PATCH", body: JSON.stringify(changes) },
    getState().auth.token,
  );
});

const rolesSlice = createSlice({
  name: "roles",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRoles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRoles.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(createRole.fulfilled, (state, action) => {
        state.items.push(action.payload);
        state.items.sort((a, b) => a.name.localeCompare(b.name));
      })
      .addCase(updateRole.fulfilled, (state, action) => {
        const index = state.items.findIndex((role) => role.id === action.payload.id);
        if (index >= 0) state.items[index] = action.payload;
        state.items.sort((a, b) => a.name.localeCompare(b.name));
      })
      .addCase(deleteRole.fulfilled, (state, action) => {
        state.items = state.items.filter((role) => role.id !== action.payload);
      })
      .addMatcher(
        isAnyOf(
          fetchRoles.rejected,
          createRole.rejected,
          updateRole.rejected,
          deleteRole.rejected,
        ),
        (state, action) => {
          state.loading = false;
          state.error = action.error?.message ?? "Role request failed";
        },
      )
      .addMatcher(
        isAnyOf(createRole.pending, updateRole.pending, deleteRole.pending),
        (state) => {
          state.error = null;
        },
      )
      .addMatcher(
        isAnyOf(createRole.fulfilled, updateRole.fulfilled, deleteRole.fulfilled),
        (state) => {
          state.error = null;
        },
      );
  },
});

export default rolesSlice.reducer;
