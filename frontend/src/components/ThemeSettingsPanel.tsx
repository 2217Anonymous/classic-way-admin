"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { toastError, toastSuccess } from "@/lib/toast";
import type { ThemePageVisibility, ThemeSettingsInput } from "@/lib/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { saveDefaultTheme } from "@/store/themeSettingsSlice";

const HOME_THEMES = ["grocery", "fashion"] as const;
const SHOP_CATEGORIES = ["classic", "banner", "columns", "list"] as const;

const SHOP_LAYOUTS_BY_CATEGORY: Record<
  (typeof SHOP_CATEGORIES)[number],
  readonly string[]
> = {
  classic: [
    "left-sidebar-col-3",
    "left-sidebar-col-4",
    "right-sidebar-col-3",
    "right-sidebar-col-4",
    "full-width",
  ],
  banner: [
    "banner-left-sidebar-col-3",
    "banner-left-sidebar-col-4",
    "banner-right-sidebar-col-3",
    "banner-right-sidebar-col-4",
    "banner-full-width",
  ],
  columns: [
    "full-width-col-3",
    "full-width-col-4",
    "full-width-col-5",
    "full-width-col-6",
    "banner-full-width-col-3",
  ],
  list: [
    "list-left-sidebar",
    "list-right-sidebar",
    "list-banner-left-sidebar",
    "list-banner-right-sidebar",
    "list-full-col-2",
  ],
};

const PRODUCT_LAYOUTS = [
  "left-sidebar",
  "right-sidebar",
  "full-width",
  "accordion-left-sidebar",
  "accordion-right-sidebar",
  "accordion-full-width",
] as const;

const BLOG_LAYOUTS = [
  "left-sidebar",
  "right-sidebar",
  "full-width",
  "detail-left-sidebar",
  "detail-right-sidebar",
  "detail-full-width",
] as const;

const PAGE_VISIBILITY_KEYS: (keyof ThemePageVisibility)[] = [
  "about_us",
  "contact_us",
  "cart",
  "checkout",
  "compare",
  "faq",
  "login",
  "register",
  "wishlist",
  "terms",
  "track_order",
];

const defaultVisibility: ThemePageVisibility = {
  about_us: true,
  contact_us: true,
  cart: true,
  checkout: true,
  compare: true,
  faq: true,
  login: true,
  register: true,
  wishlist: true,
  terms: true,
  track_order: true,
};

const emptyForm: ThemeSettingsInput = {
  home_theme: "fashion",
  shop_category: "classic",
  shop_layout: "full-width",
  product_layout: "full-width",
  blog_layout: "full-width",
  page_visibility: { ...defaultVisibility },
  theme_config: null,
};

function labelize(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function pageLabel(key: keyof ThemePageVisibility) {
  return labelize(key.replace(/_/g, "-"));
}

export function ThemeSettingsPanel() {
  const dispatch = useAppDispatch();
  const { item, loading, saving, error } = useAppSelector(
    (state) => state.themeSettings,
  );
  const [form, setForm] = useState<ThemeSettingsInput>(emptyForm);

  useEffect(() => {
    if (error) toastError(dispatch, "Request failed", error);
  }, [error, dispatch]);

  useEffect(() => {
    if (!item) return;
    setForm({
      home_theme: item.home_theme,
      shop_category: item.shop_category,
      shop_layout: item.shop_layout,
      product_layout: item.product_layout,
      blog_layout: item.blog_layout,
      page_visibility: { ...defaultVisibility, ...item.page_visibility },
      theme_config: item.theme_config,
    });
  }, [item]);

  const shopLayouts = useMemo(() => {
    const category = form.shop_category as (typeof SHOP_CATEGORIES)[number];
    return SHOP_LAYOUTS_BY_CATEGORY[category] ?? SHOP_LAYOUTS_BY_CATEGORY.classic;
  }, [form.shop_category]);

  function setShopCategory(category: string) {
    const layouts =
      SHOP_LAYOUTS_BY_CATEGORY[category as (typeof SHOP_CATEGORIES)[number]] ??
      SHOP_LAYOUTS_BY_CATEGORY.classic;
    setForm((prev) => ({
      ...prev,
      shop_category: category,
      shop_layout: layouts.includes(prev.shop_layout)
        ? prev.shop_layout
        : layouts[0],
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const payload: ThemeSettingsInput = {
      home_theme: form.home_theme,
      shop_category: form.shop_category,
      shop_layout: form.shop_layout,
      product_layout: form.product_layout,
      blog_layout: form.blog_layout,
      page_visibility: { ...form.page_visibility },
      theme_config: form.theme_config ?? null,
    };
    const result = await dispatch(saveDefaultTheme(payload));
    if (saveDefaultTheme.fulfilled.match(result)) {
      toastSuccess(dispatch, "Theme settings saved", "Default theme was updated.");
    } else {
      toastError(
        dispatch,
        "Could not save theme settings",
        result.error?.message ?? "Please try again.",
      );
    }
  }

  return (
    <section className="vz-card max-w-3xl">
      <div className="vz-card-header">
        <h2 className="vz-card-title">Theme settings</h2>
      </div>
      <form onSubmit={submit} className="vz-card-body space-y-6">
        {loading && !item ? (
          <p className="text-sm text-[var(--muted)]">Loading theme settings…</p>
        ) : (
          <>
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-[var(--foreground)]">
                Home theme
              </legend>
              <div className="flex flex-wrap gap-4">
                {HOME_THEMES.map((theme) => (
                  <label
                    key={theme}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="radio"
                      name="home_theme"
                      checked={form.home_theme === theme}
                      onChange={() => setForm({ ...form, home_theme: theme })}
                    />
                    {labelize(theme)}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="block">
              <span className="vz-label">Shop category</span>
              <select
                className="form-input"
                value={form.shop_category}
                onChange={(event) => setShopCategory(event.target.value)}
              >
                {SHOP_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {labelize(category)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="vz-label">Shop layout</span>
              <select
                className="form-input"
                value={form.shop_layout}
                onChange={(event) =>
                  setForm({ ...form, shop_layout: event.target.value })
                }
              >
                {shopLayouts.map((layout) => (
                  <option key={layout} value={layout}>
                    {labelize(layout)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="vz-label">Product layout</span>
              <select
                className="form-input"
                value={form.product_layout}
                onChange={(event) =>
                  setForm({ ...form, product_layout: event.target.value })
                }
              >
                {PRODUCT_LAYOUTS.map((layout) => (
                  <option key={layout} value={layout}>
                    {labelize(layout)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="vz-label">Blog layout</span>
              <select
                className="form-input"
                value={form.blog_layout}
                onChange={(event) =>
                  setForm({ ...form, blog_layout: event.target.value })
                }
              >
                {BLOG_LAYOUTS.map((layout) => (
                  <option key={layout} value={layout}>
                    {labelize(layout)}
                  </option>
                ))}
              </select>
            </label>

            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-[var(--foreground)]">
                Page visibility
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {PAGE_VISIBILITY_KEYS.map((key) => (
                  <label
                    key={key}
                    className="flex items-center justify-between border border-[var(--card-border)] px-3 py-3 text-sm font-medium"
                  >
                    {pageLabel(key)}
                    <input
                      type="checkbox"
                      role="switch"
                      className="form-switch"
                      checked={form.page_visibility[key]}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          page_visibility: {
                            ...form.page_visibility,
                            [key]: event.target.checked,
                          },
                        })
                      }
                    />
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="flex justify-end border-t border-[var(--card-border)] pt-4">
              <button type="submit" disabled={saving} className="primary-button">
                {saving ? "Saving..." : "Save theme settings"}
              </button>
            </div>
          </>
        )}
      </form>
    </section>
  );
}
