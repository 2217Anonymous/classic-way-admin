"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { ShoppingBag } from "lucide-react";

import { QuantityStepper } from "@/components/storefront/QuantityStepper";
import { toastError, toastSuccess } from "@/lib/toast";
import type { ProductVariant } from "@/lib/types";
import { addToCart, ensureCart } from "@/store/cartSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchProducts } from "@/store/productsSlice";

function formatCurrency(value: number | string) {
  return `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const dispatch = useAppDispatch();
  const { items, loading } = useAppSelector((state) => state.products);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    void dispatch(fetchProducts());
  }, [dispatch]);

  const product = useMemo(
    () => items.find((item) => item.slug === slug) ?? null,
    [items, slug],
  );

  useEffect(() => {
    if (!product) return;
    setActiveImage(0);
    const defaults: Record<string, string> = {};
    product.attributes.forEach((attribute) => {
      if (attribute.values[0]) defaults[attribute.name] = attribute.values[0];
    });
    setSelectedOptions(defaults);
    setQuantity(1);
  }, [product]);

  const matchedVariant: ProductVariant | null = useMemo(() => {
    if (!product || product.variants.length === 0) return null;
    return (
      product.variants.find((variant) =>
        Object.entries(selectedOptions).every(
          ([key, value]) => variant.options[key] === value,
        ),
      ) ?? null
    );
  }, [product, selectedOptions]);

  if (loading && !product) {
    return <p className="p-12 text-center text-sm text-slate-500">Loading product…</p>;
  }

  if (!product) {
    return (
      <div className="space-y-4 p-12 text-center">
        <p className="text-sm text-slate-500">We couldn&apos;t find that product.</p>
        <Link href="/shop" className="primary-button inline-flex">
          Back to shop
        </Link>
      </div>
    );
  }

  const images = product.media.length > 0 ? product.media : [];
  const unitPrice = matchedVariant?.price != null ? Number(matchedVariant.price) : Number(product.price);
  const availableStock = matchedVariant ? matchedVariant.stock : product.stock;
  const outOfStock = availableStock <= 0;

  async function handleAddToCart() {
    setAdding(true);
    await dispatch(ensureCart());
    const result = await dispatch(
      addToCart({
        product_id: product!.id,
        product_name: product!.name,
        product_slug: product!.slug,
        variant_id: matchedVariant?.id ?? null,
        variant_label: matchedVariant
          ? Object.values(matchedVariant.options).join(" / ")
          : null,
        sku: matchedVariant?.sku ?? product!.sku,
        image_url: product!.primary_image_url,
        unit_price: unitPrice,
        quantity,
      }),
    );
    setAdding(false);
    if (addToCart.fulfilled.match(result)) {
      toastSuccess(dispatch, "Added to cart", `${product!.name} added to your cart.`);
    } else {
      toastError(dispatch, "Could not add to cart", "Please try again.");
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div>
        <div className="aspect-square overflow-hidden border border-[var(--card-border)] bg-slate-50">
          {images[activeImage] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={images[activeImage].url}
              alt={images[activeImage].alt_text ?? product.name}
              className="size-full object-cover"
            />
          ) : (
            <div className="grid size-full place-items-center text-sm text-slate-400">No image</div>
          )}
        </div>
        {images.length > 1 && (
          <div className="mt-3 flex gap-2">
            {images.map((media, index) => (
              <button
                key={media.id}
                type="button"
                onClick={() => setActiveImage(index)}
                className={`product-thumb ${index === activeImage ? "product-thumb-active" : ""}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={media.url} alt={media.alt_text ?? product.name} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-5">
        <div>
          {product.category_name && (
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--theme-green)]">
              {product.category_name}
            </p>
          )}
          <h1 className="mt-1 text-2xl font-bold">{product.name}</h1>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-2xl font-bold">{formatCurrency(unitPrice)}</span>
            {product.compare_at_price != null &&
              Number(product.compare_at_price) > unitPrice && (
                <span className="text-sm text-slate-400 line-through">
                  {formatCurrency(product.compare_at_price)}
                </span>
              )}
          </div>
        </div>

        {product.short_description && (
          <p className="text-sm leading-relaxed text-slate-600">{product.short_description}</p>
        )}

        {product.attributes.map((attribute) => (
          <div key={attribute.id}>
            <p className="vz-label">{attribute.name}</p>
            <div className="flex flex-wrap gap-2">
              {attribute.values.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setSelectedOptions((current) => ({ ...current, [attribute.name]: value }))
                  }
                  className={`product-size-chip ${
                    selectedOptions[attribute.name] === value ? "product-size-chip-active" : ""
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div>
          <p className="vz-label">Quantity</p>
          <QuantityStepper quantity={quantity} onChange={setQuantity} max={Math.max(1, availableStock)} />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={outOfStock || adding}
            onClick={() => void handleAddToCart()}
            className="primary-button flex-1 justify-center py-3 text-base"
          >
            <ShoppingBag size={18} />
            {outOfStock ? "Out of stock" : adding ? "Adding..." : "Add to cart"}
          </button>
        </div>

        {!outOfStock && availableStock <= 10 && (
          <p className="text-sm font-medium text-amber-600">Only {availableStock} left in stock.</p>
        )}

        {product.description && (
          <div className="border-t border-[var(--card-border)] pt-4 text-sm leading-relaxed text-slate-600">
            {product.description}
          </div>
        )}

        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
          {product.exchangeable && (
            <span className="border border-[var(--card-border)] px-2.5 py-1">Exchangeable</span>
          )}
          {product.refundable && (
            <span className="border border-[var(--card-border)] px-2.5 py-1">Refundable</span>
          )}
        </div>
      </div>
    </div>
  );
}
