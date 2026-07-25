import { createAsyncThunk, createSlice, isAnyOf } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api";
import type { CreateUserInput, User } from "@/lib/types";
import { isDemoMockForced, mockRoles, mockUsers, resolveDemoData } from "@/mock";

type StateWithAuth = { auth: { token: string | null } };

type UsersState = {
  items: User[];
  loading: boolean;
  error: string | null;
};

const initialState: UsersState = { items: [], loading: false, error: null };

let mockItems: User[] = mockUsers.map((user) => ({
  ...user,
  roles: user.roles.map((role) => ({ ...role })),
}));
let nextMockId = Math.max(0, ...mockItems.map((item) => item.id)) + 1;

function rolesFromIds(roleIds: number[]) {
  return mockRoles
    .filter((role) => roleIds.includes(role.id))
    .map((role) => ({ ...role }));
}

export const fetchUsers = createAsyncThunk<User[], void, { state: StateWithAuth }>(
  "users/fetch",
  async (_, { getState }) => {
    if (isDemoMockForced()) {
      return mockItems.map((user) => ({
        ...user,
        roles: user.roles.map((role) => ({ ...role })),
      }));
    }
    try {
      const data = await apiRequest<User[]>("/users", {}, getState().auth.token);
      return resolveDemoData(data, mockUsers);
    } catch {
      return resolveDemoData([], mockUsers);
    }
  },
);

export const createUser = createAsyncThunk<
  User,
  CreateUserInput,
  { state: StateWithAuth }
>("users/create", async (payload, { getState }) => {
  if (isDemoMockForced()) {
    const now = new Date().toISOString();
    const created: User = {
      id: nextMockId++,
      email: payload.email.trim().toLowerCase(),
      full_name: payload.full_name.trim(),
      is_active: true,
      roles: rolesFromIds(payload.role_ids),
      created_at: now,
      updated_at: now,
    };
    mockItems = [created, ...mockItems];
    return {
      ...created,
      roles: created.roles.map((role) => ({ ...role })),
    };
  }
  return apiRequest<User>(
    "/users",
    { method: "POST", body: JSON.stringify(payload) },
    getState().auth.token,
  );
});

export const updateUser = createAsyncThunk<
  User,
  {
    id: number;
    changes: Partial<Pick<User, "full_name" | "is_active">> & {
      password?: string;
      role_ids?: number[];
    };
  },
  { state: StateWithAuth }
>("users/update", async ({ id, changes }, { getState }) => {
  if (isDemoMockForced()) {
    const index = mockItems.findIndex((user) => user.id === id);
    if (index < 0) throw new Error("User not found");
    const current = mockItems[index];
    const updated: User = {
      ...current,
      full_name: changes.full_name ?? current.full_name,
      is_active: changes.is_active ?? current.is_active,
      roles:
        changes.role_ids !== undefined
          ? rolesFromIds(changes.role_ids)
          : current.roles.map((role) => ({ ...role })),
      updated_at: new Date().toISOString(),
    };
    mockItems = mockItems.map((user) => (user.id === id ? updated : user));
    return {
      ...updated,
      roles: updated.roles.map((role) => ({ ...role })),
    };
  }
  return apiRequest<User>(
    `/users/${id}`,
    { method: "PATCH", body: JSON.stringify(changes) },
    getState().auth.token,
  );
});

export const deleteUser = createAsyncThunk<number, number, { state: StateWithAuth }>(
  "users/delete",
  async (id, { getState }) => {
    if (isDemoMockForced()) {
      mockItems = mockItems.filter((user) => user.id !== id);
      return id;
    }
    await apiRequest<void>(
      `/users/${id}`,
      { method: "DELETE" },
      getState().auth.token,
    );
    return id;
  },
);

const usersSlice = createSlice({
  name: "users",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        const index = state.items.findIndex((user) => user.id === action.payload.id);
        if (index >= 0) state.items[index] = action.payload;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.items = state.items.filter((user) => user.id !== action.payload);
      })
      .addMatcher(
        isAnyOf(
          fetchUsers.rejected,
          createUser.rejected,
          updateUser.rejected,
          deleteUser.rejected,
        ),
        (state, action) => {
          state.loading = false;
          state.error = action.error?.message ?? "User request failed";
        },
      );
  },
});

export default usersSlice.reducer;
