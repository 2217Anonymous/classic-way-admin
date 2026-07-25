"use client";

import { useEffect, useMemo, useState } from "react";

import { ProductCard } from "@/components/storefront/ProductCard";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchProducts } from "@/store/productsSlice";

export default function ShopPage() {
  const dispatch = useAppDispatch();
  const { items, loading } = useAppSelector((state) => state.products);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    void dispatch(fetchProducts());
  }, [dispatch]);

  const published = useMemo(
    () => items.filter((product) => product.is_published && product.is_active),
    [items],
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    published.forEach((product) => {
      if (product.category_name) set.add(product.category_name);
    });
    return Array.from(set).sort();
  }, [published]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return published.filter((product) => {
      if (category !== "all" && product.category_name !== category) return false;
      if (!query) return true;
      return [product.name, product.category_name, product.tags]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [published, search, category]);

  return (
    <div className="space-y-6">
      <section className="border border-[var(--card-border)] bg-white p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--theme-green)]">
          New arrivals
        </p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Shop the Classic Way collection</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Comfortable everyday apparel crafted with soft fabrics and durable stitching.
        </p>
      </section>

      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search products..."
          className="table-search sm:max-w-xs"
          aria-label="Search products"
        />
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="table-filter"
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          {categories.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </section>

      {loading && published.length === 0 ? (
        <p className="p-12 text-center text-sm text-slate-500">Loading products…</p>
      ) : filtered.length === 0 ? (
        <p className="p-12 text-center text-sm text-slate-500">No products match your search.</p>
      ) : (
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </section>
      )}
    </div>
  );
}
