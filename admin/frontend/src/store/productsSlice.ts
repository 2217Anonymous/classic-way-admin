import { createAsyncThunk, createSlice, isAnyOf } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api";
import type {
  Product,
  ProductAttribute,
  ProductInput,
  ProductMedia,
  ProductVariant,
} from "@/lib/types";
import {
  isDemoMockForced,
  mockProducts,
  resolveDemoData,
  resolveDemoItem,
} from "@/mock";

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

function cloneProduct(product: Product): Product {
  return {
    ...product,
    media: product.media.map((item) => ({ ...item })),
    attributes: product.attributes.map((item) => ({
      ...item,
      values: [...item.values],
    })),
    variants: product.variants.map((item) => ({
      ...item,
      options: { ...item.options },
    })),
  };
}

let mockItems: Product[] = mockProducts.map(cloneProduct);
let nextMockId = Math.max(0, ...mockItems.map((item) => item.id)) + 1;
let nextMediaId =
  Math.max(0, ...mockItems.flatMap((item) => item.media.map((media) => media.id))) +
  1;

function getMockProduct(id: number) {
  const found = mockItems.find((item) => item.id === id);
  return found ? cloneProduct(found) : null;
}

function saveMockProduct(product: Product) {
  const index = mockItems.findIndex((item) => item.id === product.id);
  const cloned = cloneProduct(product);
  if (index >= 0) mockItems[index] = cloned;
  else mockItems.push(cloned);
  return cloneProduct(cloned);
}

function applyProductInput(base: Product, changes: ProductInput): Product {
  const now = new Date().toISOString();
  const attributes: ProductAttribute[] = (changes.attributes ?? []).map(
    (item, index) => ({
      id: base.attributes[index]?.id ?? nextMediaId + index,
      product_id: base.id,
      name: item.name,
      values: item.values,
      sort_order: item.sort_order ?? index,
      created_at: base.attributes[index]?.created_at ?? now,
    }),
  );
  const variants: ProductVariant[] = (changes.variants ?? []).map((item, index) => ({
    id: base.variants[index]?.id ?? nextMediaId + 1000 + index,
    product_id: base.id,
    sku: item.sku,
    price: item.price ?? null,
    stock: item.stock ?? 0,
    options: item.options ?? {},
    is_active: item.is_active ?? true,
    sort_order: item.sort_order ?? index,
    created_at: base.variants[index]?.created_at ?? now,
    updated_at: now,
  }));

  return {
    ...base,
    name: changes.name,
    slug: changes.slug?.trim() || base.slug,
    description: changes.description ?? null,
    short_description: changes.short_description ?? null,
    price: changes.price,
    compare_at_price: changes.compare_at_price ?? null,
    discount_percent: changes.discount_percent ?? null,
    sku: changes.sku ?? null,
    manufacturer_name: changes.manufacturer_name ?? null,
    manufacturer_brand: changes.manufacturer_brand ?? null,
    stock: changes.stock ?? 0,
    tags: changes.tags ?? null,
    visibility: changes.visibility ?? base.visibility,
    published_at: changes.published_at ?? null,
    category_id: changes.category_id ?? null,
    brand_id: changes.brand_id ?? null,
    is_published: changes.is_published ?? base.is_published,
    is_active: changes.is_active ?? base.is_active,
    is_featured: changes.is_featured ?? base.is_featured ?? false,
    is_trending: changes.is_trending ?? base.is_trending ?? false,
    is_best_seller: changes.is_best_seller ?? base.is_best_seller ?? false,
    exchangeable: changes.exchangeable ?? base.exchangeable,
    refundable: changes.refundable ?? base.refundable,
    sort_order: changes.sort_order ?? base.sort_order,
    attributes,
    variants,
    updated_at: now,
  };
}

export const fetchProducts = createAsyncThunk<
  Product[],
  void,
  { state: StateWithAuth }
>("products/fetch", async (_, { getState }) => {
  if (isDemoMockForced()) return mockItems.map(cloneProduct);
  try {
    const data = await apiRequest<Product[]>(
      "/products",
      {},
      getState().auth.token,
    );
    return resolveDemoData(data, mockProducts);
  } catch {
    return resolveDemoData([], mockProducts);
  }
});

export const fetchProduct = createAsyncThunk<
  Product,
  number,
  { state: StateWithAuth }
>("products/fetchOne", async (id, { getState, rejectWithValue }) => {
  if (isDemoMockForced()) {
    const mock = getMockProduct(id);
    if (mock) return mock;
    return rejectWithValue("Product not found") as never;
  }
  try {
    const data = await apiRequest<Product>(
      `/products/${id}`,
      {},
      getState().auth.token,
    );
    const resolved = resolveDemoItem(data, mockProducts, id);
    if (resolved) return resolved;
    return data;
  } catch {
    const mock = resolveDemoItem(null, mockProducts, id);
    if (mock) return mock;
    return rejectWithValue("Product not found") as never;
  }
});

export const createProduct = createAsyncThunk<
  Product,
  ProductInput,
  { state: StateWithAuth }
>("products/create", async (payload, { getState }) => {
  if (isDemoMockForced()) {
    const now = new Date().toISOString();
    const id = nextMockId++;
    const slug =
      payload.slug?.trim() ||
      payload.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    const created = applyProductInput(
      {
        id,
        name: payload.name,
        slug,
        description: null,
        short_description: null,
        price: 0,
        compare_at_price: null,
        discount_percent: null,
        sku: null,
        manufacturer_name: null,
        manufacturer_brand: null,
        stock: 0,
        tags: null,
        visibility: "public",
        published_at: null,
        category_id: null,
        category_name: null,
        brand_id: null,
        is_published: false,
        is_active: true,
        is_featured: false,
        is_trending: false,
        is_best_seller: false,
        exchangeable: false,
        refundable: false,
        sort_order: 0,
        primary_image_url: null,
        media: [],
        attributes: [],
        variants: [],
        created_at: now,
        updated_at: now,
      },
      payload,
    );
    return saveMockProduct(created);
  }
  return apiRequest<Product>(
    "/products",
    { method: "POST", body: JSON.stringify(payload) },
    getState().auth.token,
  );
});

export const updateProduct = createAsyncThunk<
  Product,
  { id: number; changes: ProductInput },
  { state: StateWithAuth }
>("products/update", async ({ id, changes }, { getState }) => {
  if (isDemoMockForced()) {
    const existing = getMockProduct(id);
    if (!existing) throw new Error("Product not found");
    return saveMockProduct(applyProductInput(existing, changes));
  }
  return apiRequest<Product>(
    `/products/${id}`,
    { method: "PATCH", body: JSON.stringify(changes) },
    getState().auth.token,
  );
});

export const uploadProductMedia = createAsyncThunk<
  Product,
  { id: number; file: File; altText?: string },
  { state: StateWithAuth }
>("products/uploadMedia", async ({ id, file, altText }, { getState }) => {
  if (isDemoMockForced()) {
    const existing = getMockProduct(id);
    if (!existing) throw new Error("Product not found");
    const now = new Date().toISOString();
    const media: ProductMedia = {
      id: nextMediaId++,
      product_id: id,
      url: URL.createObjectURL(file),
      alt_text: altText ?? existing.name,
      sort_order: existing.media.length,
      is_primary: existing.media.length === 0,
      created_at: now,
    };
    existing.media = [...existing.media, media];
    existing.primary_image_url =
      existing.media.find((item) => item.is_primary)?.url ?? media.url;
    existing.updated_at = now;
    return saveMockProduct(existing);
  }
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
  { productId: number; mediaId: number },
  { state: StateWithAuth }
>("products/deleteMedia", async ({ productId, mediaId }, { getState }) => {
  if (isDemoMockForced()) {
    const existing = getMockProduct(productId);
    if (!existing) throw new Error("Product not found");
    const removed = existing.media.find((item) => item.id === mediaId);
    existing.media = existing.media.filter((item) => item.id !== mediaId);
    if (removed?.is_primary && existing.media[0]) {
      existing.media = existing.media.map((item, index) => ({
        ...item,
        is_primary: index === 0,
        sort_order: index,
      }));
    } else {
      existing.media = existing.media.map((item, index) => ({
        ...item,
        sort_order: index,
      }));
    }
    existing.primary_image_url =
      existing.media.find((item) => item.is_primary)?.url ??
      existing.media[0]?.url ??
      null;
    existing.updated_at = new Date().toISOString();
    return saveMockProduct(existing);
  }
  return apiRequest<Product>(
    `/products/${productId}/media/${mediaId}`,
    { method: "DELETE" },
    getState().auth.token,
  );
});

export const setPrimaryProductMedia = createAsyncThunk<
  Product,
  { productId: number; mediaId: number },
  { state: StateWithAuth }
>("products/setPrimaryMedia", async ({ productId, mediaId }, { getState }) => {
  if (isDemoMockForced()) {
    const existing = getMockProduct(productId);
    if (!existing) throw new Error("Product not found");
    existing.media = existing.media.map((item) => ({
      ...item,
      is_primary: item.id === mediaId,
    }));
    existing.primary_image_url =
      existing.media.find((item) => item.is_primary)?.url ?? null;
    existing.updated_at = new Date().toISOString();
    return saveMockProduct(existing);
  }
  return apiRequest<Product>(
    `/products/${productId}/media/${mediaId}/primary`,
    { method: "POST" },
    getState().auth.token,
  );
});

export const reorderProductMedia = createAsyncThunk<
  Product,
  { productId: number; mediaIds: number[] },
  { state: StateWithAuth }
>("products/reorderMedia", async ({ productId, mediaIds }, { getState }) => {
  if (isDemoMockForced()) {
    const existing = getMockProduct(productId);
    if (!existing) throw new Error("Product not found");
    const byId = new Map(existing.media.map((item) => [item.id, item]));
    if (
      mediaIds.length !== existing.media.length ||
      mediaIds.some((id) => !byId.has(id))
    ) {
      throw new Error("Invalid media order");
    }
    existing.media = mediaIds.map((id, index) => ({
      ...byId.get(id)!,
      sort_order: index,
      is_primary: index === 0,
    }));
    existing.primary_image_url = existing.media[0]?.url ?? null;
    existing.updated_at = new Date().toISOString();
    return saveMockProduct(existing);
  }
  return apiRequest<Product>(
    `/products/${productId}/media/order`,
    { method: "PUT", body: JSON.stringify({ media_ids: mediaIds }) },
    getState().auth.token,
  );
});

export const deleteProduct = createAsyncThunk<
  number,
  number,
  { state: StateWithAuth }
>("products/delete", async (id, { getState }) => {
  if (isDemoMockForced()) {
    mockItems = mockItems.filter((item) => item.id !== id);
    return id;
  }
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
