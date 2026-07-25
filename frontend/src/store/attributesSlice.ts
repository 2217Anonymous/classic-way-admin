import { createAsyncThunk, createSlice, isAnyOf } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api";
import type {
  AttributeDefinition,
  AttributeDefinitionInput,
} from "@/lib/types";
import { isDemoMockForced, mockAttributes, resolveDemoData } from "@/mock";

type StateWithAuth = { auth: { token: string | null } };

type AttributesState = {
  items: AttributeDefinition[];
  loading: boolean;
  error: string | null;
};

const initialState: AttributesState = {
  items: [],
  loading: false,
  error: null,
};

let mockItems: AttributeDefinition[] = mockAttributes.map((item) => ({
  ...item,
  values: [...item.values],
}));
let nextMockId = Math.max(0, ...mockItems.map((item) => item.id)) + 1;

export const fetchAttributes = createAsyncThunk<
  AttributeDefinition[],
  void,
  { state: StateWithAuth }
>("attributes/fetch", async (_, { getState }) => {
  if (isDemoMockForced()) {
    return mockItems.map((item) => ({ ...item, values: [...item.values] }));
  }
  try {
    const data = await apiRequest<AttributeDefinition[]>(
      "/attributes",
      {},
      getState().auth.token,
    );
    return resolveDemoData(data, mockAttributes);
  } catch {
    return resolveDemoData([], mockAttributes);
  }
});

export const createAttribute = createAsyncThunk<
  AttributeDefinition,
  AttributeDefinitionInput,
  { state: StateWithAuth }
>("attributes/create", async (payload, { getState }) => {
  if (isDemoMockForced()) {
    const now = new Date().toISOString();
    const created: AttributeDefinition = {
      id: nextMockId++,
      name: payload.name.trim(),
      values: [...payload.values],
      sort_order: payload.sort_order ?? 0,
      is_active: payload.is_active ?? true,
      created_at: now,
      updated_at: now,
    };
    mockItems = [...mockItems, created];
    return { ...created, values: [...created.values] };
  }
  return apiRequest<AttributeDefinition>(
    "/attributes",
    { method: "POST", body: JSON.stringify(payload) },
    getState().auth.token,
  );
});

export const updateAttribute = createAsyncThunk<
  AttributeDefinition,
  { id: number; changes: AttributeDefinitionInput },
  { state: StateWithAuth }
>("attributes/update", async ({ id, changes }, { getState }) => {
  if (isDemoMockForced()) {
    const index = mockItems.findIndex((item) => item.id === id);
    if (index < 0) throw new Error("Attribute not found");
    const current = mockItems[index];
    const updated: AttributeDefinition = {
      ...current,
      name: changes.name.trim(),
      values: [...changes.values],
      sort_order:
        changes.sort_order !== undefined
          ? changes.sort_order
          : current.sort_order,
      is_active:
        changes.is_active !== undefined ? changes.is_active : current.is_active,
      updated_at: new Date().toISOString(),
    };
    mockItems = mockItems.map((item) => (item.id === id ? updated : item));
    return { ...updated, values: [...updated.values] };
  }
  return apiRequest<AttributeDefinition>(
    `/attributes/${id}`,
    { method: "PATCH", body: JSON.stringify(changes) },
    getState().auth.token,
  );
});

export const deleteAttribute = createAsyncThunk<
  number,
  number,
  { state: StateWithAuth }
>("attributes/delete", async (id, { getState }) => {
  if (isDemoMockForced()) {
    mockItems = mockItems.filter((item) => item.id !== id);
    return id;
  }
  await apiRequest<void>(
    `/attributes/${id}`,
    { method: "DELETE" },
    getState().auth.token,
  );
  return id;
});

const attributesSlice = createSlice({
  name: "attributes",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAttributes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAttributes.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(createAttribute.fulfilled, (state, action) => {
        const exists = state.items.some((item) => item.id === action.payload.id);
        if (!exists) state.items.push(action.payload);
        state.error = null;
      })
      .addCase(updateAttribute.fulfilled, (state, action) => {
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index >= 0) state.items[index] = action.payload;
        else state.items.push(action.payload);
      })
      .addCase(deleteAttribute.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.id !== action.payload);
        state.error = null;
      })
      .addMatcher(
        isAnyOf(
          fetchAttributes.rejected,
          createAttribute.rejected,
          updateAttribute.rejected,
          deleteAttribute.rejected,
        ),
        (state, action) => {
          state.loading = false;
          state.error = action.error?.message ?? "Attribute request failed";
        },
      )
      .addMatcher(
        isAnyOf(
          createAttribute.pending,
          updateAttribute.pending,
          deleteAttribute.pending,
        ),
        (state) => {
          state.error = null;
        },
      );
  },
});

export default attributesSlice.reducer;
