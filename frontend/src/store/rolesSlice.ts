import { createAsyncThunk, createSlice, isAnyOf } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api";
import type { Role } from "@/lib/types";
import { isDemoMockForced, mockRoles, resolveDemoData } from "@/mock";

type StateWithAuth = { auth: { token: string | null } };
type RolesState = { items: Role[]; loading: boolean; error: string | null };

const initialState: RolesState = { items: [], loading: false, error: null };

let mockItems: Role[] = mockRoles.map((role) => ({ ...role }));
let nextMockId = Math.max(0, ...mockItems.map((item) => item.id)) + 1;

export const fetchRoles = createAsyncThunk<Role[], void, { state: StateWithAuth }>(
  "roles/fetch",
  async (_, { getState }) => {
    if (isDemoMockForced()) return mockItems.map((role) => ({ ...role }));
    try {
      const data = await apiRequest<Role[]>("/roles", {}, getState().auth.token);
      return resolveDemoData(data, mockRoles);
    } catch {
      return resolveDemoData([], mockRoles);
    }
  },
);

export const createRole = createAsyncThunk<
  Role,
  { name: string; description: string },
  { state: StateWithAuth }
>("roles/create", async (payload, { getState }) => {
  if (isDemoMockForced()) {
    const created: Role = {
      id: nextMockId++,
      name: payload.name.trim(),
      description: payload.description.trim() || null,
      created_at: new Date().toISOString(),
    };
    mockItems = [...mockItems, created].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    return { ...created };
  }
  return apiRequest<Role>(
    "/roles",
    { method: "POST", body: JSON.stringify(payload) },
    getState().auth.token,
  );
});

export const deleteRole = createAsyncThunk<number, number, { state: StateWithAuth }>(
  "roles/delete",
  async (id, { getState }) => {
    if (isDemoMockForced()) {
      mockItems = mockItems.filter((role) => role.id !== id);
      return id;
    }
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
  { id: number; changes: { name?: string; description?: string } },
  { state: StateWithAuth }
>("roles/update", async ({ id, changes }, { getState }) => {
  if (isDemoMockForced()) {
    const index = mockItems.findIndex((role) => role.id === id);
    if (index < 0) throw new Error("Role not found");
    const updated: Role = {
      ...mockItems[index],
      name: changes.name?.trim() ?? mockItems[index].name,
      description:
        changes.description !== undefined
          ? changes.description.trim() || null
          : mockItems[index].description,
    };
    mockItems = mockItems
      .map((role) => (role.id === id ? updated : role))
      .sort((a, b) => a.name.localeCompare(b.name));
    return { ...updated };
  }
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
