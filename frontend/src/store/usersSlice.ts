import { createAsyncThunk, createSlice, isAnyOf } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api";
import type { CreateUserInput, User } from "@/lib/types";

type StateWithAuth = { auth: { token: string | null } };

type UsersState = {
  items: User[];
  loading: boolean;
  error: string | null;
};

const initialState: UsersState = { items: [], loading: false, error: null };

export const fetchUsers = createAsyncThunk<User[], void, { state: StateWithAuth }>(
  "users/fetch",
  async (_, { getState }) => {
    return apiRequest<User[]>("/users", {}, getState().auth.token);
  },
);

export const createUser = createAsyncThunk<
  User,
  CreateUserInput,
  { state: StateWithAuth }
>("users/create", async (payload, { getState }) => {
  return apiRequest<User>(
    "/users",
    { method: "POST", body: JSON.stringify(payload) },
    getState().auth.token,
  );
});

export const updateUser = createAsyncThunk<
  User,
  {
    id: string;
    changes: Partial<Pick<User, "full_name" | "is_active">> & {
      password?: string;
      role_ids?: string[];
    };
  },
  { state: StateWithAuth }
>("users/update", async ({ id, changes }, { getState }) => {
  return apiRequest<User>(
    `/users/${id}`,
    { method: "PATCH", body: JSON.stringify(changes) },
    getState().auth.token,
  );
});

export const deleteUser = createAsyncThunk<string, string, { state: StateWithAuth }>(
  "users/delete",
  async (id, { getState }) => {
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
