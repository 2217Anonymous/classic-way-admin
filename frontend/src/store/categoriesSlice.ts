import { createAsyncThunk, createSlice, isAnyOf } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api";
import type { Category, CategoryInput, CategoryTreeNode } from "@/lib/types";
import {
  buildCategoryTree,
  isDemoMockForced,
  mockCategories,
  mockCategoryTree,
  resolveDemoData,
} from "@/mock";

type StateWithAuth = { auth: { token: string | null } };

type CategoriesState = {
  items: Category[];
  tree: CategoryTreeNode[];
  loading: boolean;
  error: string | null;
};

const initialState: CategoriesState = {
  items: [],
  tree: [],
  loading: false,
  error: null,
};

let mockItems: Category[] = mockCategories.map((item) => ({ ...item }));
let nextMockId = Math.max(0, ...mockItems.map((item) => item.id)) + 1;

function pruneTree(
  nodes: CategoryTreeNode[],
  deletedIds: Set<number>,
): CategoryTreeNode[] {
  return nodes
    .filter((node) => !deletedIds.has(node.id))
    .map((node) => ({
      ...node,
      children: pruneTree(node.children, deletedIds),
    }));
}

function collectDescendantIds(id: number, items: Category[]): number[] {
  const children = items.filter((item) => item.parent_id === id);
  return children.flatMap((child) => [
    child.id,
    ...collectDescendantIds(child.id, items),
  ]);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const fetchCategories = createAsyncThunk<
  Category[],
  void,
  { state: StateWithAuth }
>("categories/fetch", async (_, { getState }) => {
  if (isDemoMockForced()) return mockItems.map((item) => ({ ...item }));
  try {
    const data = await apiRequest<Category[]>(
      "/categories",
      {},
      getState().auth.token,
    );
    return resolveDemoData(data, mockCategories);
  } catch {
    return resolveDemoData([], mockCategories);
  }
});

export const fetchCategoryTree = createAsyncThunk<
  CategoryTreeNode[],
  void,
  { state: StateWithAuth }
>("categories/fetchTree", async (_, { getState }) => {
  if (isDemoMockForced()) return buildCategoryTree(mockItems);
  try {
    const data = await apiRequest<CategoryTreeNode[]>(
      "/categories/tree",
      {},
      getState().auth.token,
    );
    return resolveDemoData(data, mockCategoryTree);
  } catch {
    return resolveDemoData([], mockCategoryTree);
  }
});

export const createCategory = createAsyncThunk<
  Category,
  CategoryInput,
  { state: StateWithAuth }
>("categories/create", async (payload, { getState }) => {
  if (isDemoMockForced()) {
    const now = new Date().toISOString();
    const created: Category = {
      id: nextMockId++,
      name: payload.name.trim(),
      slug: payload.slug?.trim() || slugify(payload.name),
      description: payload.description?.trim() || null,
      image_url: null,
      parent_id: payload.parent_id ?? null,
      is_active: payload.is_active ?? true,
      sort_order: payload.sort_order ?? 0,
      created_at: now,
      updated_at: now,
    };
    mockItems = [...mockItems, created];
    return { ...created };
  }
  return apiRequest<Category>(
    "/categories",
    { method: "POST", body: JSON.stringify(payload) },
    getState().auth.token,
  );
});

export const updateCategory = createAsyncThunk<
  Category,
  { id: number; changes: CategoryInput },
  { state: StateWithAuth }
>("categories/update", async ({ id, changes }, { getState }) => {
  if (isDemoMockForced()) {
    const index = mockItems.findIndex((item) => item.id === id);
    if (index < 0) throw new Error("Category not found");
    const current = mockItems[index];
    const updated: Category = {
      ...current,
      name: changes.name.trim(),
      slug: changes.slug?.trim() || slugify(changes.name),
      description:
        changes.description !== undefined
          ? changes.description.trim() || null
          : current.description,
      parent_id:
        changes.parent_id !== undefined ? changes.parent_id : current.parent_id,
      is_active:
        changes.is_active !== undefined ? changes.is_active : current.is_active,
      sort_order:
        changes.sort_order !== undefined
          ? changes.sort_order
          : current.sort_order,
      updated_at: new Date().toISOString(),
    };
    mockItems = mockItems.map((item) => (item.id === id ? updated : item));
    return { ...updated };
  }
  return apiRequest<Category>(
    `/categories/${id}`,
    { method: "PATCH", body: JSON.stringify(changes) },
    getState().auth.token,
  );
});

export const uploadCategoryImage = createAsyncThunk<
  Category,
  { id: number; file: File },
  { state: StateWithAuth }
>("categories/uploadImage", async ({ id, file }, { getState }) => {
  if (isDemoMockForced()) {
    const index = mockItems.findIndex((item) => item.id === id);
    if (index < 0) throw new Error("Category not found");
    const updated: Category = {
      ...mockItems[index],
      image_url: URL.createObjectURL(file),
      updated_at: new Date().toISOString(),
    };
    mockItems = mockItems.map((item) => (item.id === id ? updated : item));
    return { ...updated };
  }
  const body = new FormData();
  body.append("file", file);
  return apiRequest<Category>(
    `/categories/${id}/image`,
    { method: "POST", body },
    getState().auth.token,
  );
});

export const deleteCategory = createAsyncThunk<
  number[],
  number,
  { state: StateWithAuth }
>("categories/delete", async (id, { getState }) => {
  if (isDemoMockForced()) {
    const deletedIds = [id, ...collectDescendantIds(id, mockItems)];
    const deletedSet = new Set(deletedIds);
    mockItems = mockItems.filter((item) => !deletedSet.has(item.id));
    return deletedIds;
  }
  const result = await apiRequest<{ deleted_ids: number[] }>(
    `/categories/${id}`,
    { method: "DELETE" },
    getState().auth.token,
  );
  return result.deleted_ids;
});

const categoriesSlice = createSlice({
  name: "categories",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchCategoryTree.fulfilled, (state, action) => {
        state.tree = action.payload;
      })
      .addCase(createCategory.fulfilled, (state, action) => {
        const exists = state.items.some(
          (category) => category.id === action.payload.id,
        );
        if (!exists) {
          state.items.push(action.payload);
          state.items.sort(
            (a, b) =>
              a.sort_order - b.sort_order || a.name.localeCompare(b.name),
          );
        }
        state.error = null;
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        const index = state.items.findIndex(
          (category) => category.id === action.payload.id,
        );
        if (index >= 0) state.items[index] = action.payload;
        else state.items.push(action.payload);
        state.items.sort(
          (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
        );
      })
      .addCase(uploadCategoryImage.fulfilled, (state, action) => {
        const index = state.items.findIndex(
          (category) => category.id === action.payload.id,
        );
        if (index >= 0) state.items[index] = action.payload;
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        const deletedIds = new Set(action.payload);
        state.items = state.items.filter(
          (category) => !deletedIds.has(category.id),
        );
        state.tree = pruneTree(state.tree, deletedIds);
        state.error = null;
      })
      .addMatcher(
        isAnyOf(
          fetchCategories.rejected,
          fetchCategoryTree.rejected,
          createCategory.rejected,
          updateCategory.rejected,
          uploadCategoryImage.rejected,
          deleteCategory.rejected,
        ),
        (state, action) => {
          state.loading = false;
          state.error = action.error?.message ?? "Category request failed";
        },
      )
      .addMatcher(
        isAnyOf(
          createCategory.pending,
          updateCategory.pending,
          uploadCategoryImage.pending,
          deleteCategory.pending,
        ),
        (state) => {
          state.error = null;
        },
      );
  },
});

export default categoriesSlice.reducer;
