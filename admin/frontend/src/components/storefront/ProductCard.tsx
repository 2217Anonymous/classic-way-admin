import Link from "next/link";

import type { Product } from "@/lib/types";

function formatCurrency(value: number | string) {
  return `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function ProductCard({ product }: { product: Product }) {
  const hasDiscount =
    product.compare_at_price != null &&
    Number(product.compare_at_price) > Number(product.price);

  return (
    <Link
      href={`/shop/${product.slug}`}
      className="group block border border-[var(--card-border)] bg-white transition hover:border-[var(--theme-green)]"
    >
      <div className="aspect-square overflow-hidden bg-slate-50">
        {product.primary_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.primary_image_url}
            alt={product.name}
            className="size-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="grid size-full place-items-center text-xs text-slate-400">No image</div>
        )}
      </div>
      <div className="space-y-1.5 p-3.5">
        {product.category_name && (
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--theme-green)]">
            {product.category_name}
          </p>
        )}
        <p className="line-clamp-2 text-sm font-semibold text-[var(--foreground)]">{product.name}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-base font-bold text-[var(--foreground)]">
            {formatCurrency(product.price)}
          </span>
          {hasDiscount && (
            <span className="text-xs text-slate-400 line-through">
              {formatCurrency(product.compare_at_price as number)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
