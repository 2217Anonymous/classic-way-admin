"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Package,
  Plus,
  Search,
  Star,
} from "lucide-react";

import { ActionIconButtons } from "@/components/ActionIconButtons";
import {
  SelectTd,
  SelectTh,
  SelectionBar,
  TablePagination,
} from "@/components/DataTableControls";
import { useRowSelection } from "@/hooks/useRowSelection";
import { useTableState } from "@/hooks/useTableState";
import { mediaUrl } from "@/lib/api";
import { toastError, toastSuccess } from "@/lib/toast";
import type { Product } from "@/lib/types";
import { fetchCategories } from "@/store/categoriesSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { deleteProduct, fetchProducts } from "@/store/productsSlice";

import { ConfirmDialog } from "./Modal";

type PublishTab = "all" | "published" | "draft";
type ProductSortKey = "id" | "name" | "price" | "stock" | "published";

function formatPrice(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return `₹ ${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPublished(product: Product) {
  const raw = product.published_at || product.created_at;
  if (!raw) return "—";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/** Stable display-only metrics when API has no orders/rating fields */
function demoOrders(product: Product) {
  return 10 + ((product.id * 17) % 90);
}

function demoRating(product: Product) {
  return (3.5 + ((product.id * 3) % 16) / 10).toFixed(1);
}

function ProductThumb({ product }: { product: Product }) {
  const src = mediaUrl(product.primary_image_url);
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={product.name}
        className="size-11 object-cover"
      />
    );
  }
  return (
    <span className="grid size-11 place-items-center bg-[#f3f6f9] text-slate-400">
      <Package size={18} />
    </span>
  );
}

function FilterSection({
  title,
  count,
  open,
  onToggle,
  children,
}: {
  title: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-[var(--card-border)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-700"
      >
        <span>
          {title}
          {typeof count === "number" ? (
            <span className="ml-1 text-[var(--muted)]">({count})</span>
          ) : null}
        </span>
        <ChevronDown
          size={14}
          className={`text-[var(--muted)] transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? <div className="px-4 pb-4">{children}</div> : null}
    </div>
  );
}

export function ProductsPanel() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { items, loading, error } = useAppSelector((state) => state.products);
  const categories = useAppSelector((state) => state.categories.items);
  const dataRevision = useAppSelector((state) => state.dataSource.revision);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [publishTab, setPublishTab] = useState<PublishTab>("all");
  const [categoryFilter, setCategoryFilter] = useState<number | "all">("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [discountOnly, setDiscountOnly] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(0);
  const [priceInitialized, setPriceInitialized] = useState(false);
  const [brandsOpen, setBrandsOpen] = useState(true);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);

  useEffect(() => {
    void dispatch(fetchProducts());
    void dispatch(fetchCategories());
  }, [dispatch, dataRevision]);

  useEffect(() => {
    if (error) toastError(dispatch, "Request failed", error);
  }, [error, dispatch]);

  const priceBounds = useMemo(() => {
    if (items.length === 0) return { min: 0, max: 2000 };
    const prices = items.map((item) => Number(item.price) || 0);
    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices)),
    };
  }, [items]);

  useEffect(() => {
    if (!priceInitialized && items.length > 0) {
      setPriceMin(priceBounds.min);
      setPriceMax(priceBounds.max);
      setPriceInitialized(true);
    }
  }, [items.length, priceBounds, priceInitialized]);

  const categoryCounts = useMemo(() => {
    const map = new Map<number | "none", number>();
    for (const product of items) {
      const key = product.category_id ?? "none";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [items]);

  const brands = useMemo(() => {
    const map = new Map<string, number>();
    for (const product of items) {
      const brand = product.manufacturer_brand?.trim() || "Unbranded";
      map.set(brand, (map.get(brand) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  const tabCounts = useMemo(() => {
    const published = items.filter((item) => item.is_published).length;
    return {
      all: items.length,
      published,
      draft: items.length - published,
    };
  }, [items]);

  const matchesSearch = useCallback((product: Product, query: string) => {
    const haystack = [
      product.name,
      product.slug,
      product.sku ?? "",
      product.category_name ?? "",
      product.description ?? "",
      product.tags ?? "",
      product.manufacturer_brand ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  }, []);

  const getSortValue = useCallback((product: Product, key: ProductSortKey) => {
    switch (key) {
      case "id":
        return product.id;
      case "name":
        return product.name;
      case "price":
        return Number(product.price);
      case "stock":
        return product.stock;
      case "published":
        return product.published_at || product.created_at || "";
      default:
        return product.name;
    }
  }, []);

  const filtered = useMemo(() => {
    return items.filter((product) => {
      if (publishTab === "published" && !product.is_published) return false;
      if (publishTab === "draft" && product.is_published) return false;
      if (
        categoryFilter !== "all" &&
        product.category_id !== categoryFilter
      ) {
        return false;
      }
      const brand = product.manufacturer_brand?.trim() || "Unbranded";
      if (brandFilter !== "all" && brand !== brandFilter) return false;
      if (discountOnly) {
        const discount = Number(product.discount_percent ?? 0);
        const hasCompare =
          product.compare_at_price != null &&
          Number(product.compare_at_price) > Number(product.price);
        if (discount <= 0 && !hasCompare) return false;
      }
      const price = Number(product.price) || 0;
      if (price < priceMin || price > priceMax) return false;
      if (minRating > 0 && Number(demoRating(product)) < minRating) return false;
      return true;
    });
  }, [
    items,
    publishTab,
    categoryFilter,
    brandFilter,
    discountOnly,
    priceMin,
    priceMax,
    minRating,
  ]);

  const table = useTableState<Product, ProductSortKey>({
    rows: filtered,
    initialSort: { key: "id", direction: "desc" },
    getSortValue,
    matchesSearch,
  });

  const getProductId = useCallback((product: Product) => product.id, []);
  const selection = useRowSelection(table.pageRows, getProductId);

  function clearFilters() {
    setCategoryFilter("all");
    setBrandFilter("all");
    setDiscountOnly(false);
    setMinRating(0);
    setPriceMin(priceBounds.min);
    setPriceMax(priceBounds.max);
    setPublishTab("all");
    table.setSearch("");
    table.setPage(1);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await dispatch(deleteProduct(deleteTarget.id));
    setDeleting(false);
    if (deleteProduct.fulfilled.match(result)) {
      toastSuccess(dispatch, "Product deleted", `${deleteTarget.name} was removed.`);
      setDeleteTarget(null);
      selection.clear();
    } else {
      toastError(
        dispatch,
        "Could not delete product",
        result.error?.message ?? "Please try again.",
      );
    }
  }

  async function confirmBulkDelete() {
    if (selection.selectedIds.length === 0) return;
    setDeleting(true);
    let ok = 0;
    for (const id of selection.selectedIds) {
      const result = await dispatch(deleteProduct(id));
      if (deleteProduct.fulfilled.match(result)) ok += 1;
    }
    setDeleting(false);
    setBulkDeleteOpen(false);
    selection.clear();
    if (ok > 0) {
      toastSuccess(dispatch, "Products deleted", `${ok} product(s) removed.`);
    } else {
      toastError(dispatch, "Could not delete products", "Please try again.");
    }
  }

  const selectedBrandCount = brandFilter === "all" ? 0 : 1;
  const discountCount = discountOnly ? 1 : 0;
  const ratingCount = minRating > 0 ? 1 : 0;

  return (
    <>
      <div className="product-list-layout">
        <aside className="product-filters">
          <div className="flex items-center justify-between border-b border-[var(--card-border)] px-4 py-3">
            <h2 className="text-base font-semibold">Filters</h2>
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm font-semibold text-[var(--theme-green)] hover:underline"
            >
              Clear All
            </button>
          </div>

          <div className="space-y-4 p-4">
            <select
              className="form-input"
              value={categoryFilter === "all" ? "all" : String(categoryFilter)}
              onChange={(event) => {
                const value = event.target.value;
                setCategoryFilter(value === "all" ? "all" : Number(value));
                table.setPage(1);
              }}
              aria-label="Quick category select"
            >
              <option value="all">Select...</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
                Products
              </p>
              <ul className="space-y-0.5">
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryFilter("all");
                      table.setPage(1);
                    }}
                    className={`product-filter-link ${
                      categoryFilter === "all" ? "product-filter-link-active" : ""
                    }`}
                  >
                    All categories
                    <span className="text-[var(--muted)]">({items.length})</span>
                  </button>
                </li>
                {categories.map((category) => {
                  const count = categoryCounts.get(category.id) ?? 0;
                  return (
                    <li key={category.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryFilter(category.id);
                          table.setPage(1);
                        }}
                        className={`product-filter-link ${
                          categoryFilter === category.id
                            ? "product-filter-link-active"
                            : ""
                        }`}
                      >
                        <span className="truncate">{category.name}</span>
                        <span className="shrink-0 text-[var(--muted)]">
                          ({count})
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
                Price
              </p>
              <input
                type="range"
                min={priceBounds.min}
                max={priceBounds.max}
                value={priceMax}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setPriceMax(Math.max(next, priceMin));
                  table.setPage(1);
                }}
                className="product-price-range"
                aria-label="Maximum price"
              />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="sr-only">Min price</span>
                  <input
                    type="number"
                    className="form-input-sm w-full"
                    value={priceMin}
                    min={priceBounds.min}
                    max={priceMax}
                    onChange={(event) => {
                      setPriceMin(Number(event.target.value) || 0);
                      table.setPage(1);
                    }}
                  />
                </label>
                <label className="block">
                  <span className="sr-only">Max price</span>
                  <input
                    type="number"
                    className="form-input-sm w-full"
                    value={priceMax}
                    min={priceMin}
                    max={priceBounds.max}
                    onChange={(event) => {
                      setPriceMax(Number(event.target.value) || 0);
                      table.setPage(1);
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          <FilterSection
            title="Brands"
            count={selectedBrandCount || brands.length}
            open={brandsOpen}
            onToggle={() => setBrandsOpen((open) => !open)}
          >
            <ul className="space-y-1.5">
              <li>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="brand"
                    checked={brandFilter === "all"}
                    onChange={() => {
                      setBrandFilter("all");
                      table.setPage(1);
                    }}
                  />
                  All brands
                </label>
              </li>
              {brands.map(([brand, count]) => (
                <li key={brand}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="brand"
                      checked={brandFilter === brand}
                      onChange={() => {
                        setBrandFilter(brand);
                        table.setPage(1);
                      }}
                    />
                    <span className="flex-1 truncate">{brand}</span>
                    <span className="text-xs text-[var(--muted)]">({count})</span>
                  </label>
                </li>
              ))}
            </ul>
          </FilterSection>

          <FilterSection
            title="Discount"
            count={discountCount}
            open={discountOpen}
            onToggle={() => setDiscountOpen((open) => !open)}
          >
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={discountOnly}
                onChange={(event) => {
                  setDiscountOnly(event.target.checked);
                  table.setPage(1);
                }}
              />
              On sale only
            </label>
          </FilterSection>

          <FilterSection
            title="Rating"
            count={ratingCount}
            open={ratingOpen}
            onToggle={() => setRatingOpen((open) => !open)}
          >
            <ul className="space-y-1.5">
              {[0, 4, 3, 2].map((rating) => (
                <li key={rating}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="rating"
                      checked={minRating === rating}
                      onChange={() => {
                        setMinRating(rating);
                        table.setPage(1);
                      }}
                    />
                    {rating === 0 ? (
                      "Any rating"
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        {rating}+ <Star size={12} className="text-[#f7b84b]" fill="currentColor" />
                      </span>
                    )}
                  </label>
                </li>
              ))}
            </ul>
          </FilterSection>
        </aside>

        <section className="product-list-main">
          <div className="product-publish-tabs">
            {(
              [
                { key: "all", label: "All", count: tabCounts.all },
                { key: "published", label: "Published", count: tabCounts.published },
                { key: "draft", label: "Draft", count: tabCounts.draft },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setPublishTab(tab.key);
                  table.setPage(1);
                }}
                className={`product-publish-tab ${
                  publishTab === tab.key ? "product-publish-tab-active" : ""
                }`}
              >
                {tab.label}
                <span className="product-tab-count">{tab.count}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--card-border)] px-4 py-3">
            <label className="relative min-w-[220px] flex-1 max-w-md">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
              />
              <input
                className="form-input pl-9"
                placeholder="Search Product..."
                value={table.search}
                onChange={(event) => table.setSearch(event.target.value)}
                aria-label="Search products"
              />
            </label>
            <button
              type="button"
              onClick={() => router.push("/products/new")}
              className="primary-button"
            >
              <Plus size={16} /> Add Product
            </button>
          </div>

          <SelectionBar
            count={selection.selectedCount}
            onClear={selection.clear}
            onDelete={() => setBulkDeleteOpen(true)}
            deleting={deleting}
          />

          <div className="overflow-x-auto">
            <table className="product-list-table">
              <thead>
                <tr>
                  <SelectTh
                    checked={selection.allSelected}
                    indeterminate={selection.someSelected}
                    onChange={selection.togglePage}
                  />
                  <th>#</th>
                  <th>Product</th>
                  <th>Stock</th>
                  <th>Price</th>
                  <th>Orders</th>
                  <th>Rating</th>
                  <th>Published</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {table.pageRows.map((product, index) => {
                  const rowNumber =
                    (table.page - 1) * table.pageSize + index + 1;
                  return (
                    <tr key={product.id}>
                      <SelectTd
                        checked={selection.isSelected(product.id)}
                        onChange={() => selection.toggleOne(product.id)}
                        label={`Select ${product.name}`}
                      />
                      <td className="text-[var(--muted)]">{rowNumber}</td>
                      <td>
                        <div className="flex items-center gap-3">
                          <ProductThumb product={product} />
                          <div className="min-w-0">
                            <p className="font-semibold text-[var(--foreground)]">
                              {product.name}
                            </p>
                            <p className="text-xs text-[var(--muted)]">
                              Category : {product.category_name || "Uncategorized"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td>{product.stock}</td>
                      <td className="font-semibold">{formatPrice(product.price)}</td>
                      <td>{demoOrders(product)}</td>
                      <td>
                        <span className="inline-flex items-center gap-1">
                          <Star
                            size={13}
                            className="text-[#f7b84b]"
                            fill="currentColor"
                          />
                          {demoRating(product)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-[var(--muted)]">
                        {formatPublished(product)}
                      </td>
                      <td>
                        <ActionIconButtons
                          viewLabel={`View ${product.name}`}
                          editLabel={`Edit ${product.name}`}
                          deleteLabel={`Delete ${product.name}`}
                          onView={() => router.push(`/products/${product.id}`)}
                          onEdit={() =>
                            router.push(`/products/${product.id}/edit`)
                          }
                          onDelete={() => setDeleteTarget(product)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!loading && table.filteredCount === 0 && (
              <p className="p-10 text-center text-sm text-slate-500">
                {items.length === 0
                  ? "No products yet. Create your first product."
                  : "No products match your search or filters."}
              </p>
            )}
          </div>

          <TablePagination
            page={table.page}
            pageCount={table.pageCount}
            onPageChange={table.setPage}
            filteredCount={table.filteredCount}
            pageSize={table.pageSize}
          />
        </section>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete product?"
        message={`This will permanently delete ${deleteTarget?.name ?? "this product"} and its media.`}
        busy={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
      <ConfirmDialog
        open={bulkDeleteOpen}
        title="Delete selected products?"
        message={`This will permanently delete ${selection.selectedCount} selected product(s).`}
        busy={deleting}
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={() => void confirmBulkDelete()}
      />
    </>
  );
}
