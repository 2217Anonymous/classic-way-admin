import { createAsyncThunk, createSlice, isAnyOf } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api";
import type { Cart } from "@/lib/types";

type StateWithAuth = { auth: { token: string | null } };

type CartState = {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
};

const initialState: CartState = {
  cart: null,
  loading: false,
  error: null,
};

export const CART_STORAGE_KEY = "cw_cart_id";

function readCartToken(): string {
  if (typeof window === "undefined") return "demo-cart";
  let token = window.localStorage.getItem(CART_STORAGE_KEY);
  if (!token) {
    token = `cw-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(CART_STORAGE_KEY, token);
  }
  return token;
}

export const ensureCart = createAsyncThunk<Cart, void, { state: StateWithAuth }>(
  "cart/ensure",
  async (_, { getState }) => {
    const token = readCartToken();
    return apiRequest<Cart>(`/carts/${token}`, {}, getState().auth.token);
  },
);

export type AddToCartPayload = {
  product_id: string;
  product_name: string;
  product_slug: string;
  variant_id?: string | null;
  variant_label?: string | null;
  sku?: string | null;
  image_url?: string | null;
  unit_price: number;
  quantity: number;
};

export const addToCart = createAsyncThunk<
  Cart,
  AddToCartPayload,
  { state: StateWithAuth }
>("cart/addItem", async (payload, { getState }) => {
  return apiRequest<Cart>(
    `/carts/${readCartToken()}/items`,
    { method: "POST", body: JSON.stringify(payload) },
    getState().auth.token,
  );
});

export const updateCartItemQuantity = createAsyncThunk<
  Cart,
  { itemId: string; quantity: number },
  { state: StateWithAuth }
>("cart/updateQuantity", async ({ itemId, quantity }, { getState }) => {
  return apiRequest<Cart>(
    `/carts/${readCartToken()}/items/${itemId}`,
    { method: "PATCH", body: JSON.stringify({ quantity }) },
    getState().auth.token,
  );
});

export const removeCartItem = createAsyncThunk<
  Cart,
  string,
  { state: StateWithAuth }
>("cart/removeItem", async (itemId, { getState }) => {
  return apiRequest<Cart>(
    `/carts/${readCartToken()}/items/${itemId}`,
    { method: "DELETE" },
    getState().auth.token,
  );
});

export const applyCartCoupon = createAsyncThunk<
  Cart,
  string,
  { state: StateWithAuth }
>("cart/applyCoupon", async (code, { getState }) => {
  return apiRequest<Cart>(
    `/carts/${readCartToken()}/coupon`,
    { method: "POST", body: JSON.stringify({ code }) },
    getState().auth.token,
  );
});

export const removeCartCoupon = createAsyncThunk<
  Cart,
  void,
  { state: StateWithAuth }
>("cart/removeCoupon", async (_, { getState }) => {
  return apiRequest<Cart>(
    `/carts/${readCartToken()}/coupon`,
    { method: "DELETE" },
    getState().auth.token,
  );
});

export const clearCart = createAsyncThunk<Cart, void, { state: StateWithAuth }>(
  "cart/clear",
  async (_, { getState }) => {
    return apiRequest<Cart>(
      `/carts/${readCartToken()}/clear`,
      { method: "POST" },
      getState().auth.token,
    );
  },
);

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(ensureCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addMatcher(
        isAnyOf(
          ensureCart.fulfilled,
          addToCart.fulfilled,
          updateCartItemQuantity.fulfilled,
          removeCartItem.fulfilled,
          applyCartCoupon.fulfilled,
          removeCartCoupon.fulfilled,
          clearCart.fulfilled,
        ),
        (state, action) => {
          state.loading = false;
          state.cart = action.payload;
        },
      )
      .addMatcher(
        isAnyOf(
          ensureCart.rejected,
          addToCart.rejected,
          updateCartItemQuantity.rejected,
          removeCartItem.rejected,
          applyCartCoupon.rejected,
          removeCartCoupon.rejected,
          clearCart.rejected,
        ),
        (state, action) => {
          state.loading = false;
          state.error = action.error?.message ?? "Cart request failed";
        },
      );
  },
});

export default cartSlice.reducer;
