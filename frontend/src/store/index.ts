import { configureStore } from "@reduxjs/toolkit";

import addressesReducer from "./addressesSlice";
import authReducer from "./authSlice";
import attributesReducer from "./attributesSlice";
import brandsReducer from "./brandsSlice";
import cartReducer from "./cartSlice";
import categoriesReducer from "./categoriesSlice";
import couponsReducer from "./couponsSlice";
import customersReducer from "./customersSlice";
import inventoryReducer from "./inventorySlice";
import notificationsReducer from "./notificationsSlice";
import ordersReducer from "./ordersSlice";
import paymentsReducer from "./paymentsSlice";
import productsReducer from "./productsSlice";
import reportsReducer from "./reportsSlice";
import reviewsReducer from "./reviewsSlice";
import rolesReducer from "./rolesSlice";
import shipmentsReducer from "./shipmentsSlice";
import storeSettingsReducer from "./storeSettingsSlice";
import taxReducer from "./taxSlice";
import toastReducer from "./toastSlice";
import usersReducer from "./usersSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    users: usersReducer,
    roles: rolesReducer,
    categories: categoriesReducer,
    products: productsReducer,
    brands: brandsReducer,
    attributes: attributesReducer,
    storeSettings: storeSettingsReducer,
    tax: taxReducer,
    coupons: couponsReducer,
    inventory: inventoryReducer,
    cart: cartReducer,
    addresses: addressesReducer,
    orders: ordersReducer,
    payments: paymentsReducer,
    shipments: shipmentsReducer,
    customers: customersReducer,
    reviews: reviewsReducer,
    notifications: notificationsReducer,
    reports: reportsReducer,
    toast: toastReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
