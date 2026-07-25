import { createAsyncThunk, createSlice, isAnyOf } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api";
import type { Cart, CartItem } from "@/lib/types";
import { isDemoMockForced, mockCoupons } from "@/mock";

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

function emptyCart(token: string): Cart {
  return {
    id: 1,
    cart_token: token,
    customer_id: null,
    status: "active",
    items: [],
    subtotal: 0,
    discount_total: 0,
    coupon_code: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

let mockCartState: Cart | null = null;

function ensureMockCart(): Cart {
  if (!mockCartState) mockCartState = emptyCart(readCartToken());
  return mockCartState;
}

function recalc(cart: Cart): Cart {
  const subtotal = cart.items.reduce((sum, item) => sum + item.line_total, 0);
  let discount_total = 0;
  if (cart.coupon_code) {
    const coupon = mockCoupons.find(
      (item) => item.code.toUpperCase() === cart.coupon_code?.toUpperCase(),
    );
    if (coupon) {
      discount_total =
        coupon.discount_type === "percent"
          ? Math.round(subtotal * (Number(coupon.discount_value) / 100) * 100) / 100
          : Math.min(subtotal, Number(coupon.discount_value));
    }
  }
  return {
    ...cart,
    subtotal: Math.round(subtotal * 100) / 100,
    discount_total,
    updated_at: new Date().toISOString(),
  };
}

export const ensureCart = createAsyncThunk<Cart, void, { state: StateWithAuth }>(
  "cart/ensure",
  async (_, { getState }) => {
    const token = readCartToken();
    if (isDemoMockForced()) return { ...ensureMockCart() };
    try {
      return await apiRequest<Cart>(
        `/carts/${token}`,
        {},
        getState().auth.token,
      );
    } catch {
      return { ...ensureMockCart() };
    }
  },
);

export type AddToCartPayload = {
  product_id: number;
  product_name: string;
  product_slug: string;
  variant_id?: number | null;
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
  if (isDemoMockForced()) {
    const cart = ensureMockCart();
    const existing = cart.items.find(
      (item) =>
        item.product_id === payload.product_id &&
        item.variant_id === (payload.variant_id ?? null),
    );
    let items: CartItem[];
    if (existing) {
      items = cart.items.map((item) =>
        item.id === existing.id
          ? {
              ...item,
              quantity: item.quantity + payload.quantity,
              line_total:
                (item.quantity + payload.quantity) * item.unit_price,
            }
          : item,
      );
    } else {
      const nextId = Math.max(0, ...cart.items.map((item) => item.id)) + 1;
      items = [
        ...cart.items,
        {
          id: nextId,
          cart_id: cart.id,
          product_id: payload.product_id,
          product_name: payload.product_name,
          product_slug: payload.product_slug,
          variant_id: payload.variant_id ?? null,
          variant_label: payload.variant_label ?? null,
          sku: payload.sku ?? null,
          image_url: payload.image_url ?? null,
          unit_price: payload.unit_price,
          quantity: payload.quantity,
          line_total: payload.unit_price * payload.quantity,
        },
      ];
    }
    mockCartState = recalc({ ...cart, items });
    return { ...mockCartState };
  }
  return apiRequest<Cart>(
    `/carts/${readCartToken()}/items`,
    { method: "POST", body: JSON.stringify(payload) },
    getState().auth.token,
  );
});

export const updateCartItemQuantity = createAsyncThunk<
  Cart,
  { itemId: number; quantity: number },
  { state: StateWithAuth }
>("cart/updateQuantity", async ({ itemId, quantity }, { getState }) => {
  if (isDemoMockForced()) {
    const cart = ensureMockCart();
    const items = cart.items
      .map((item) =>
        item.id === itemId
          ? { ...item, quantity, line_total: item.unit_price * quantity }
          : item,
      )
      .filter((item) => item.quantity > 0);
    mockCartState = recalc({ ...cart, items });
    return { ...mockCartState };
  }
  return apiRequest<Cart>(
    `/carts/${readCartToken()}/items/${itemId}`,
    { method: "PATCH", body: JSON.stringify({ quantity }) },
    getState().auth.token,
  );
});

export const removeCartItem = createAsyncThunk<
  Cart,
  number,
  { state: StateWithAuth }
>("cart/removeItem", async (itemId, { getState }) => {
  if (isDemoMockForced()) {
    const cart = ensureMockCart();
    const items = cart.items.filter((item) => item.id !== itemId);
    mockCartState = recalc({ ...cart, items });
    return { ...mockCartState };
  }
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
  if (isDemoMockForced()) {
    const coupon = mockCoupons.find(
      (item) => item.code.toUpperCase() === code.trim().toUpperCase() && item.is_active,
    );
    if (!coupon) throw new Error("Invalid or expired coupon code");
    const cart = ensureMockCart();
    mockCartState = recalc({ ...cart, coupon_code: coupon.code });
    return { ...mockCartState };
  }
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
  if (isDemoMockForced()) {
    const cart = ensureMockCart();
    mockCartState = recalc({ ...cart, coupon_code: null });
    return { ...mockCartState };
  }
  return apiRequest<Cart>(
    `/carts/${readCartToken()}/coupon`,
    { method: "DELETE" },
    getState().auth.token,
  );
});

export const clearCart = createAsyncThunk<Cart, void, { state: StateWithAuth }>(
  "cart/clear",
  async (_, { getState }) => {
    if (isDemoMockForced()) {
      const token = readCartToken();
      mockCartState = emptyCart(token);
      return { ...mockCartState };
    }
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
