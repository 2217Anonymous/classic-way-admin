import { createAsyncThunk, createSlice, isAnyOf } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api";
import type { Product, ProductInput } from "@/lib/types";

type StateWithAuth = { auth: { token: string | null } };

type ProductsState = {
  items: Product[];
  loading: boolean;
  error: string | null;
};

const initialState: ProductsState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchProducts = createAsyncThunk<
  Product[],
  void,
  { state: StateWithAuth }
>("products/fetch", async (_, { getState }) => {
  return apiRequest<Product[]>("/products", {}, getState().auth.token);
});

export const fetchProduct = createAsyncThunk<
  Product,
  string,
  { state: StateWithAuth }
>("products/fetchOne", async (id, { getState }) => {
  return apiRequest<Product>(`/products/${id}`, {}, getState().auth.token);
});

export const createProduct = createAsyncThunk<
  Product,
  ProductInput,
  { state: StateWithAuth }
>("products/create", async (payload, { getState }) => {
  return apiRequest<Product>(
    "/products",
    { method: "POST", body: JSON.stringify(payload) },
    getState().auth.token,
  );
});

export const updateProduct = createAsyncThunk<
  Product,
  { id: string; changes: ProductInput },
  { state: StateWithAuth }
>("products/update", async ({ id, changes }, { getState }) => {
  return apiRequest<Product>(
    `/products/${id}`,
    { method: "PATCH", body: JSON.stringify(changes) },
    getState().auth.token,
  );
});

export const uploadProductMedia = createAsyncThunk<
  Product,
  { id: string; file: File; altText?: string },
  { state: StateWithAuth }
>("products/uploadMedia", async ({ id, file, altText }, { getState }) => {
  const body = new FormData();
  body.append("file", file);
  if (altText) body.append("alt_text", altText);
  return apiRequest<Product>(
    `/products/${id}/media`,
    { method: "POST", body },
    getState().auth.token,
  );
});

export const deleteProductMedia = createAsyncThunk<
  Product,
  { productId: string; mediaId: string },
  { state: StateWithAuth }
>("products/deleteMedia", async ({ productId, mediaId }, { getState }) => {
  return apiRequest<Product>(
    `/products/${productId}/media/${mediaId}`,
    { method: "DELETE" },
    getState().auth.token,
  );
});

export const setPrimaryProductMedia = createAsyncThunk<
  Product,
  { productId: string; mediaId: string },
  { state: StateWithAuth }
>("products/setPrimaryMedia", async ({ productId, mediaId }, { getState }) => {
  return apiRequest<Product>(
    `/products/${productId}/media/${mediaId}/primary`,
    { method: "POST" },
    getState().auth.token,
  );
});

export const reorderProductMedia = createAsyncThunk<
  Product,
  { productId: string; mediaIds: string[] },
  { state: StateWithAuth }
>("products/reorderMedia", async ({ productId, mediaIds }, { getState }) => {
  return apiRequest<Product>(
    `/products/${productId}/media/order`,
    { method: "PUT", body: JSON.stringify({ media_ids: mediaIds }) },
    getState().auth.token,
  );
});

export const deleteProduct = createAsyncThunk<
  string,
  string,
  { state: StateWithAuth }
>("products/delete", async (id, { getState }) => {
  await apiRequest<void>(
    `/products/${id}`,
    { method: "DELETE" },
    getState().auth.token,
  );
  return id;
});

const productsSlice = createSlice({
  name: "products",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchProduct.fulfilled, (state, action) => {
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index >= 0) state.items[index] = action.payload;
        else state.items.push(action.payload);
        state.loading = false;
        state.error = null;
      })
      .addCase(createProduct.fulfilled, (state, action) => {
        const exists = state.items.some((item) => item.id === action.payload.id);
        if (!exists) state.items.push(action.payload);
        state.error = null;
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index >= 0) state.items[index] = action.payload;
        else state.items.push(action.payload);
      })
      .addCase(uploadProductMedia.fulfilled, (state, action) => {
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index >= 0) state.items[index] = action.payload;
      })
      .addCase(deleteProductMedia.fulfilled, (state, action) => {
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index >= 0) state.items[index] = action.payload;
      })
      .addCase(setPrimaryProductMedia.fulfilled, (state, action) => {
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index >= 0) state.items[index] = action.payload;
      })
      .addCase(reorderProductMedia.fulfilled, (state, action) => {
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index >= 0) state.items[index] = action.payload;
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.id !== action.payload);
        state.error = null;
      })
      .addMatcher(
        isAnyOf(
          fetchProducts.rejected,
          fetchProduct.rejected,
          createProduct.rejected,
          updateProduct.rejected,
          uploadProductMedia.rejected,
          deleteProductMedia.rejected,
          setPrimaryProductMedia.rejected,
          reorderProductMedia.rejected,
          deleteProduct.rejected,
        ),
        (state, action) => {
          state.loading = false;
          state.error = action.error?.message ?? "Product request failed";
        },
      )
      .addMatcher(
        isAnyOf(
          createProduct.pending,
          updateProduct.pending,
          uploadProductMedia.pending,
          deleteProduct.pending,
        ),
        (state) => {
          state.error = null;
        },
      );
  },
});

export default productsSlice.reducer;
