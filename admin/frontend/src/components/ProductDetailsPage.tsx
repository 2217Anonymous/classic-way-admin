"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  FileText,
  Layers,
  Package,
  Pencil,
  Star,
  Wallet,
} from "lucide-react";

import { mediaUrl } from "@/lib/api";
import { toastError } from "@/lib/toast";
import type { Product } from "@/lib/types";
import {
  mockRatingSummary,
  reviewsForProduct,
} from "@/mock";
import { useAppDispatch } from "@/store/hooks";
import { fetchProduct } from "@/store/productsSlice";

function formatPrice(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return `$${amount.toFixed(2)}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function attrValues(product: Product, names: string[]) {
  const match = product.attributes.find((item) =>
    names.some((name) => item.name.toLowerCase() === name.toLowerCase()),
  );
  return match?.values ?? [];
}

function colorSwatch(value: string) {
  const key = value.trim().toLowerCase();
  const map: Record<string, string> = {
    red: "#ef4444",
    blue: "#3b82f6",
    "light blue": "#93c5fd",
    green: "#22c55e",
    cyan: "#06b6d4",
    yellow: "#eab308",
    orange: "#f97316",
    white: "#ffffff",
    black: "#111827",
    pink: "#ec4899",
    purple: "#a855f7",
    gray: "#9ca3af",
    grey: "#9ca3af",
    brown: "#92400e",
    navy: "#1e3a8a",
  };
  return map[key] ?? "#cbd5e1";
}

export function ProductDetailsPage({ productId }: { productId: number }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [tab, setTab] = useState<"specification" | "details">("specification");
  const [zoom, setZoom] = useState({ active: false, x: 50, y: 50 });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void dispatch(fetchProduct(productId)).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (!fetchProduct.fulfilled.match(result)) {
        toastError(dispatch, "Could not load product", "Returning to product list.");
        router.replace("/?tab=products");
        return;
      }
      setProduct(result.payload);
      setActiveIndex(0);
      const sizeValues = attrValues(result.payload, ["Size", "Sizes"]);
      setSelectedSize(sizeValues[0] ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [dispatch, productId, router]);

  const images = useMemo(() => {
    if (!product) return [] as string[];
    const media = [...product.media].sort((a, b) => {
      if (a.is_primary === b.is_primary) return a.sort_order - b.sort_order;
      return a.is_primary ? -1 : 1;
    });
    const urls = media
      .map((item) => mediaUrl(item.url))
      .filter((url): url is string => Boolean(url));
    if (urls.length === 0 && product.primary_image_url) {
      const primary = mediaUrl(product.primary_image_url);
      if (primary) return [primary];
    }
    return urls;
  }, [product]);

  const sizes = useMemo(
    () => (product ? attrValues(product, ["Size", "Sizes"]) : []),
    [product],
  );
  const colors = useMemo(
    () => (product ? attrValues(product, ["Color", "Colors", "Colour"]) : []),
    [product],
  );
  const materials = useMemo(
    () => (product ? attrValues(product, ["Material"]) : []),
    [product],
  );
  const tags = useMemo(
    () =>
      (product?.tags ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    [product],
  );
  const reviews = useMemo(
    () => (product ? reviewsForProduct(product.id) : []),
    [product],
  );

  if (loading || !product) {
    return (
      <div className="vz-card">
        <div className="vz-card-body py-16 text-center text-sm text-[var(--muted)]">
          Loading product details…
        </div>
      </div>
    );
  }

  const activeImage = images[activeIndex] ?? null;
  const estimatedOrders = Math.max(0, Math.round(Number(product.stock) * 1.8));
  const estimatedRevenue = Number(product.price) * Math.max(estimatedOrders, 1);
  const maxDist = Math.max(
    ...mockRatingSummary.distribution.map((item) => item.count),
    1,
  );

  function prevImage() {
    if (images.length === 0) return;
    setActiveIndex((index) => (index - 1 + images.length) % images.length);
  }

  function nextImage() {
    if (images.length === 0) return;
    setActiveIndex((index) => (index + 1) % images.length);
  }

  return (
    <section className="product-details-shell">
      <div className="product-details-layout">
        <aside className="product-details-gallery">
          <div
            className="product-zoom-stage"
            onMouseEnter={() => setZoom((current) => ({ ...current, active: true }))}
            onMouseLeave={() => setZoom({ active: false, x: 50, y: 50 })}
            onMouseMove={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              const x = ((event.clientX - rect.left) / rect.width) * 100;
              const y = ((event.clientY - rect.top) / rect.height) * 100;
              setZoom({ active: true, x, y });
            }}
          >
            {activeImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activeImage}
                alt={product.name}
                className="product-zoom-image"
                style={
                  zoom.active
                    ? {
                        transform: "scale(1.9)",
                        transformOrigin: `${zoom.x}% ${zoom.y}%`,
                      }
                    : undefined
                }
              />
            ) : (
              <div className="grid h-full place-items-center text-[var(--muted)]">
                <Package size={42} />
              </div>
            )}

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  className="product-zoom-nav left-3"
                  onClick={prevImage}
                  aria-label="Previous image"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  className="product-zoom-nav right-3"
                  onClick={nextImage}
                  aria-label="Next image"
                >
                  <ChevronRight size={16} />
                </button>
              </>
            )}
          </div>

          {images.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2.5">
              {images.map((src, index) => (
                <button
                  key={`${src}-${index}`}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`product-thumb ${
                    index === activeIndex ? "product-thumb-active" : ""
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
          )}
        </aside>

        <div className="product-details-content">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-[var(--foreground)] sm:text-2xl">
                {product.name}
              </h2>
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--muted)]">
                <span>
                  Brand :{" "}
                  <span className="font-medium text-[var(--theme-green)]">
                    {product.manufacturer_brand || "Classic Way"}
                  </span>
                </span>
                <span>
                  Seller :{" "}
                  <span className="font-medium text-[var(--theme-green)]">
                    {product.manufacturer_name || "Classic Way Retail"}
                  </span>
                </span>
                <span>
                  Published :{" "}
                  <span className="font-medium text-[var(--foreground)]">
                    {formatDate(product.published_at || product.created_at)}
                  </span>
                </span>
                <span>
                  Exchangeable :{" "}
                  <span className="font-medium text-[var(--foreground)]">
                    {product.exchangeable ? "Yes" : "No"}
                  </span>
                </span>
                <span>
                  Refundable :{" "}
                  <span className="font-medium text-[var(--foreground)]">
                    {product.refundable ? "Yes" : "No"}
                  </span>
                </span>
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-0.5 text-[#f7b84b]">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} size={14} fill="currentColor" />
                  ))}
                </div>
                <span className="text-sm text-[var(--muted)]">
                  ( {mockRatingSummary.totalLabel} Customer Review )
                </span>
              </div>
            </div>
            <Link
              href={`/products/${product.id}/edit`}
              className="action-icon-btn action-icon-edit"
              aria-label="Edit product"
              title="Edit product"
            >
              <Pencil size={15} />
            </Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Price"
              value={formatPrice(product.price)}
              icon={<Wallet size={16} />}
            />
            <StatCard
              label="No. of Orders"
              value={estimatedOrders.toLocaleString()}
              icon={<FileText size={16} />}
            />
            <StatCard
              label="Available Stocks"
              value={product.stock.toLocaleString()}
              icon={<Layers size={16} />}
            />
            <StatCard
              label="Total Revenue"
              value={formatPrice(estimatedRevenue)}
              icon={<Briefcase size={16} />}
            />
          </div>

          {sizes.length > 0 && (
            <div className="mt-6">
              <p className="mb-2.5 text-sm font-semibold">Sizes :</p>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`product-size-chip ${
                      selectedSize === size ? "product-size-chip-active" : ""
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {colors.length > 0 && (
            <div className="mt-5">
              <p className="mb-2.5 text-sm font-semibold">Colors :</p>
              <div className="flex flex-wrap gap-2.5">
                {colors.map((color) => (
                  <span
                    key={color}
                    title={color}
                    className="product-color-dot"
                    style={{ background: colorSwatch(color) }}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="mt-6">
            <p className="mb-2 text-sm font-semibold">Description :</p>
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              {product.short_description ||
                product.description ||
                "No description available for this product."}
            </p>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-semibold">Features :</p>
              <ul className="space-y-1.5 text-sm text-[var(--muted)]">
                {(tags.length > 0
                  ? tags
                  : ["Full Sleeve", "Cotton", "All Sizes available"]
                ).map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 size-1.5 shrink-0 bg-[var(--theme-green)]" />
                    {item}
                  </li>
                ))}
                {colors.length > 0 && (
                  <li className="flex gap-2">
                    <span className="mt-2 size-1.5 shrink-0 bg-[var(--theme-green)]" />
                    {colors.length} Different Color
                  </li>
                )}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">Services :</p>
              <ul className="space-y-1.5 text-sm text-[var(--muted)]">
                <li>10 Days Replacement</li>
                <li>Cash on Delivery available</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t border-[var(--card-border)] pt-6">
            <h3 className="text-base font-bold text-[var(--foreground)]">
              Product Description :
            </h3>
            <div className="mt-3 flex gap-6 border-b border-[var(--card-border)]">
              <button
                type="button"
                onClick={() => setTab("specification")}
                className={`border-b-2 py-2.5 text-sm font-semibold ${
                  tab === "specification"
                    ? "border-[var(--theme-green)] text-[var(--theme-green)]"
                    : "border-transparent text-[var(--muted)]"
                }`}
              >
                Specification
              </button>
              <button
                type="button"
                onClick={() => setTab("details")}
                className={`border-b-2 py-2.5 text-sm font-semibold ${
                  tab === "details"
                    ? "border-[var(--theme-green)] text-[var(--theme-green)]"
                    : "border-transparent text-[var(--muted)]"
                }`}
              >
                Details
              </button>
            </div>

            <div className="pt-4">
              {tab === "specification" ? (
                <table className="w-full max-w-xl text-sm">
                  <tbody>
                    <SpecRow label="Category" value={product.category_name || "—"} />
                    <SpecRow
                      label="Brand"
                      value={product.manufacturer_brand || "Classic Way"}
                    />
                    <SpecRow label="Color" value={colors.join(", ") || "—"} />
                    <SpecRow
                      label="Material"
                      value={materials.join(", ") || "Cotton"}
                    />
                    <SpecRow label="SKU" value={product.sku || "—"} />
                    <SpecRow
                      label="Weight"
                      value={`${120 + (product.id % 40)} Gram`}
                    />
                  </tbody>
                </table>
              ) : (
                <div className="space-y-4">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--muted)]">
                    {product.description ||
                      product.short_description ||
                      "No detailed description provided."}
                  </p>
                  {product.variants.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[var(--card-border)] text-left">
                            <th className="py-2 pr-4 font-semibold">SKU</th>
                            <th className="py-2 pr-4 font-semibold">Options</th>
                            <th className="py-2 pr-4 font-semibold">Price</th>
                            <th className="py-2 font-semibold">Stock</th>
                          </tr>
                        </thead>
                        <tbody>
                          {product.variants.map((variant) => (
                            <tr
                              key={variant.id}
                              className="border-b border-[var(--card-border)]"
                            >
                              <td className="py-2.5 pr-4">{variant.sku}</td>
                              <td className="py-2.5 pr-4 text-[var(--muted)]">
                                {Object.entries(variant.options)
                                  .map(([key, value]) => `${key}: ${value}`)
                                  .join(", ") || "—"}
                              </td>
                              <td className="py-2.5 pr-4">
                                {variant.price != null
                                  ? formatPrice(variant.price)
                                  : formatPrice(product.price)}
                              </td>
                              <td className="py-2.5">{variant.stock}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 border-t border-[var(--card-border)] pt-6">
            <h3 className="text-base font-bold text-[var(--foreground)]">
              Ratings & Reviews
            </h3>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-0.5 text-[#f7b84b]">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} size={16} fill="currentColor" />
                ))}
              </div>
              <span className="text-sm font-semibold">
                {mockRatingSummary.average} out of 5
              </span>
              <span className="text-sm text-[var(--muted)]">
                Total {mockRatingSummary.totalLabel} reviews
              </span>
            </div>

            <div className="mt-5 grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
              <div className="space-y-2.5">
                {mockRatingSummary.distribution.map((item) => (
                  <div key={item.stars} className="flex items-center gap-2 text-xs">
                    <span className="w-12 shrink-0 text-[var(--muted)]">
                      {item.stars} star
                    </span>
                    <div className="h-1.5 flex-1 bg-[#eef0f2]">
                      <div
                        className="h-full"
                        style={{
                          width: `${(item.count / maxDist) * 100}%`,
                          background: item.tone,
                        }}
                      />
                    </div>
                    <span className="w-10 text-right text-[var(--muted)]">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-0">
                {reviews.map((review, index) => (
                  <article
                    key={review.id}
                    className={`py-4 ${
                      index > 0 ? "border-t border-dashed border-[var(--card-border)]" : ""
                    }`}
                  >
                    <div className="mb-2 inline-flex items-center gap-1 bg-[var(--theme-green)] px-2 py-0.5 text-xs font-semibold text-white">
                      <Star size={11} fill="currentColor" />
                      {review.rating.toFixed(1)}
                    </div>
                    <p className="text-sm leading-relaxed text-[var(--muted)]">
                      {review.comment}
                    </p>
                    {review.images.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {review.images.map((src) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={src}
                            src={src}
                            alt=""
                            className="size-12 object-cover border border-[var(--card-border)]"
                          />
                        ))}
                      </div>
                    )}
                    <p className="mt-3 text-sm">
                      <span className="font-semibold text-[var(--foreground)]">
                        {review.author}
                      </span>
                      <span className="text-[var(--muted)]"> · {review.date}</span>
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 border border-[var(--card-border)] bg-[#f8f9fa] px-3 py-3">
      <span className="grid size-9 shrink-0 place-items-center bg-[var(--theme-green-soft)] text-[var(--theme-green)]">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-[var(--foreground)]">
          {value}
        </p>
        <p className="text-xs text-[var(--muted)]">{label}</p>
      </div>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-[var(--card-border)]">
      <td className="w-36 py-3 pr-4 font-semibold text-[var(--foreground)]">
        {label}
      </td>
      <td className="py-3 text-[var(--muted)]">{value}</td>
    </tr>
  );
}
