"use client";

import { useEffect } from "react";
import { Provider } from "react-redux";

import { Toaster } from "@/components/Toaster";
import type { User } from "@/lib/types";
import { hydrateAuth } from "@/store/authSlice";
import { hydrateDataSource } from "@/store/dataSourceSlice";
import { store } from "@/store";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    const rawUser = localStorage.getItem("admin_user");
    let user: User | null = null;
    try {
      user = rawUser ? (JSON.parse(rawUser) as User) : null;
    } catch {
      localStorage.removeItem("admin_user");
    }
    store.dispatch(hydrateAuth({ token, user }));
    store.dispatch(hydrateDataSource());
  }, []);

  return (
    <Provider store={store}>
      {children}
      <Toaster />
    </Provider>
  );
}
