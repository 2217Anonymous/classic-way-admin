"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bold,
  GripVertical,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Plus,
  Star,
  Trash2,
  Underline,
  UploadCloud,
  X,
} from "lucide-react";

import { CategoryFormModal } from "@/components/CategoryFormModal";
import { mediaUrl } from "@/lib/api";
import { toastError, toastSuccess, toastWarning } from "@/lib/toast";
import type {
  Product,
  ProductAttributeInput,
  ProductInput,
  ProductMedia,
  ProductVariantInput,
} from "@/lib/types";
import { fetchAttributes } from "@/store/attributesSlice";
import { fetchBrands } from "@/store/brandsSlice";
import { fetchCategories } from "@/store/categoriesSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  createProduct,
  deleteProductMedia,
  fetchProduct,
  reorderProductMedia,
  setPrimaryProductMedia,
  updateProduct,
  uploadProductMedia,
} from "@/store/productsSlice";

type AttrDraft = { name: string; values: string };
type VariantDraft = {
  sku: string;
  price: string;
  stock: string;
  optionsText: string;
  is_active: boolean;
};

type GalleryItem =
  | { key: string; kind: "saved"; media: ProductMedia }
  | { key: string; kind: "pending"; file: File; url: string };

let galleryKeySeq = 0;
function nextGalleryKey(prefix: string) {
  galleryKeySeq += 1;
  return `${prefix}-${galleryKeySeq}`;
}

const emptyForm = {
  name: "",
  slug: "",
  description: "",
  short_description: "",
  price: "",
  compare_at_price: "",
  discount_percent: "",
  sku: "",
  manufacturer_name: "",
  manufacturer_brand: "",
  brand_id: "",
  stock: "0",
  tags: "",
  visibility: "public",
  published_at: "",
  category_id: "",
  is_published: false,
  is_active: true,
  is_featured: false,
  is_trending: false,
  is_best_seller: false,
  exchangeable: false,
  refundable: false,
  sort_order: "0",
};

function FormCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="vz-card">
      <div className="vz-card-header flex items-center justify-between gap-3">
        <h2 className="vz-card-title">{title}</h2>
        {action}
      </div>
      <div className="vz-card-body">{children}</div>
    </section>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="vz-label">{children}</span>;
}

function parseTags(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function TagsMultiInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const tags = useMemo(() => parseTags(value), [value]);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function commit(raw: string) {
    const next = raw.trim().replace(/,/g, "");
    if (!next) {
      setDraft("");
      return;
    }
    const exists = tags.some((tag) => tag.toLowerCase() === next.toLowerCase());
    if (!exists) onChange([...tags, next].join(", "));
    setDraft("");
  }

  function removeTag(tag: string) {
    onChange(tags.filter((item) => item !== tag).join(", "));
  }

  return (
    <div
      className="tags-multi"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="tags-multi-body">
        {tags.map((tag) => (
          <span key={tag} className="tag-chip">
            {tag}
            <button
              type="button"
              className="tag-chip-remove"
              aria-label={`Remove ${tag}`}
              onClick={(event) => {
                event.stopPropagation();
                removeTag(tag);
              }}
            >
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          className="tags-multi-input"
          value={draft}
          placeholder={tags.length ? "Add tag…" : "Type tag, press Enter"}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              commit(draft);
              return;
            }
            if (event.key === "Backspace" && !draft && tags.length > 0) {
              event.preventDefault();
              removeTag(tags[tags.length - 1]);
            }
          }}
          onBlur={() => {
            if (draft.trim()) commit(draft);
          }}
        />
      </div>
    </div>
  );
}

function toLocalDateTimeValue(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function ProductFormPage({ productId }: { productId?: string }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const categories = useAppSelector((state) => state.categories.items);
  const brands = useAppSelector((state) => state.brands.items);
  const catalogAttributes = useAppSelector((state) => state.attributes.items);
  const editing = typeof productId === "string";
  const [busy, setBusy] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(editing);
  const [liveProduct, setLiveProduct] = useState<Product | null>(null);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [attributes, setAttributes] = useState<AttrDraft[]>([
    { name: "Size", values: "S, M, L" },
    { name: "Color", values: "Red, Blue" },
  ]);
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const submittingRef = useRef(false);
  const dragIndexRef = useRef<number | null>(null);

  useEffect(() => {
    void dispatch(fetchCategories());
    void dispatch(fetchAttributes());
    void dispatch(fetchBrands());
  }, [dispatch]);

  useEffect(() => {
    if (!editing || !productId) return;
    let cancelled = false;
    setLoadingProduct(true);
    void dispatch(fetchProduct(productId)).then((result) => {
      if (cancelled) return;
      setLoadingProduct(false);
      if (!fetchProduct.fulfilled.match(result)) {
        toastError(dispatch, "Could not load product", "Returning to product list.");
        router.replace("/?tab=products");
        return;
      }
      const product = result.payload;
      setLiveProduct(product);
      setGalleryItems(
        [...product.media]
          .sort((a, b) => {
            if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
            return a.sort_order - b.sort_order || String(a.id).localeCompare(String(b.id));
          })
          .map((media) => ({
            key: `saved-${media.id}`,
            kind: "saved" as const,
            media,
          })),
      );
      setForm({
        name: product.name,
        slug: product.slug,
        description: product.description || "",
        short_description: product.short_description || "",
        price: String(product.price ?? ""),
        compare_at_price:
          product.compare_at_price != null ? String(product.compare_at_price) : "",
        discount_percent:
          product.discount_percent != null ? String(product.discount_percent) : "",
        sku: product.sku || "",
        manufacturer_name: product.manufacturer_name || "",
        manufacturer_brand: product.manufacturer_brand || "",
        brand_id: product.brand_id ? String(product.brand_id) : "",
        stock: String(product.stock ?? 0),
        tags: product.tags || "",
        visibility: product.visibility || "public",
        published_at: toLocalDateTimeValue(product.published_at),
        category_id: product.category_id ? String(product.category_id) : "",
        is_published: product.is_published,
        is_active: product.is_active,
        is_featured: product.is_featured ?? false,
        is_trending: product.is_trending ?? false,
        is_best_seller: product.is_best_seller ?? false,
        exchangeable: product.exchangeable,
        refundable: product.refundable,
        sort_order: String(product.sort_order ?? 0),
      });
      setAttributes(
        product.attributes.length > 0
          ? product.attributes.map((item) => ({
              name: item.name,
              values: item.values.join(", "),
            }))
          : [{ name: "", values: "" }],
      );
      setVariants(
        product.variants.map((item) => ({
          sku: item.sku,
          price: item.price != null ? String(item.price) : "",
          stock: String(item.stock ?? 0),
          optionsText: Object.entries(item.options)
            .map(([key, value]) => `${key}:${value}`)
            .join(", "),
          is_active: item.is_active,
        })),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [dispatch, editing, productId, router]);

  const shortDescCount = form.short_description.trim().length;
  const galleryItemsRef = useRef(galleryItems);
  galleryItemsRef.current = galleryItems;

  useEffect(() => {
    return () => {
      galleryItemsRef.current.forEach((item) => {
        if (item.kind === "pending") URL.revokeObjectURL(item.url);
      });
    };
  }, []);

  function syncGalleryFromProduct(product: Product) {
    setLiveProduct(product);
    setGalleryItems((current) => {
      const pending = current.filter((item) => item.kind === "pending");
      const saved = [...product.media]
        .sort((a, b) => {
          if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
          return a.sort_order - b.sort_order || String(a.id).localeCompare(String(b.id));
        })
        .map((media) => ({
          key: `saved-${media.id}`,
          kind: "saved" as const,
          media,
        }));
      return [...saved, ...pending];
    });
  }

  function moveGalleryItem(from: number, to: number) {
    if (from === to || from < 0 || to < 0) return;
    setGalleryItems((current) => {
      if (from >= current.length || to >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  function wrapSelection(prefix: string, suffix = prefix) {
    const el = descriptionRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = form.description.slice(start, end) || "text";
    const next =
      form.description.slice(0, start) +
      prefix +
      selected +
      suffix +
      form.description.slice(end);
    setForm({ ...form, description: next });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    });
  }

  function buildPayload(): ProductInput {
    const attrPayload: ProductAttributeInput[] = attributes
      .filter((item) => item.name.trim())
      .map((item, index) => ({
        name: item.name.trim(),
        values: item.values
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        sort_order: index,
      }));

    const variantPayload: ProductVariantInput[] = variants
      .filter((item) => item.sku.trim())
      .map((item, index) => {
        const options: Record<string, string> = {};
        item.optionsText.split(",").forEach((pair) => {
          const [key, ...rest] = pair.split(":");
          if (!key?.trim() || rest.length === 0) return;
          options[key.trim()] = rest.join(":").trim();
        });
        return {
          sku: item.sku.trim(),
          price: item.price ? Number(item.price) : null,
          stock: Number(item.stock) || 0,
          options,
          is_active: item.is_active,
          sort_order: index,
        };
      });

    return {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      description: form.description || undefined,
      short_description: form.short_description || null,
      price: Number(form.price) || 0,
      compare_at_price: form.compare_at_price ? Number(form.compare_at_price) : null,
      discount_percent: form.discount_percent ? Number(form.discount_percent) : null,
      sku: form.sku.trim() || null,
      manufacturer_name: form.manufacturer_name.trim() || null,
      manufacturer_brand: form.manufacturer_brand.trim() || null,
      stock: Number(form.stock) || 0,
      tags: form.tags.trim() || null,
      visibility: form.visibility,
      published_at: form.published_at
        ? new Date(form.published_at).toISOString()
        : null,
      category_id: form.category_id ? String(form.category_id) : null,
      brand_id: form.brand_id ? String(form.brand_id) : null,
      is_published: form.is_published,
      is_active: form.is_active,
      is_featured: form.is_featured,
      is_trending: form.is_trending,
      is_best_seller: form.is_best_seller,
      exchangeable: form.exchangeable,
      refundable: form.refundable,
      sort_order: Number(form.sort_order) || 0,
      attributes: attrPayload,
      variants: variantPayload,
    };
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submittingRef.current || busy) return;
    if (form.short_description.trim() && shortDescCount < 100) {
      toastWarning(
        dispatch,
        "Short description too short",
        "Use at least 100 characters, or leave it empty.",
      );
      return;
    }
    submittingRef.current = true;
    setBusy(true);
    const payload = buildPayload();

    try {
      let saved: Product | null = null;
      if (editing && productId) {
        const result = await dispatch(
          updateProduct({ id: productId, changes: payload }),
        );
        if (updateProduct.fulfilled.match(result)) saved = result.payload;
      } else {
        const result = await dispatch(createProduct(payload));
        if (createProduct.fulfilled.match(result)) saved = result.payload;
      }

      if (!saved) {
        toastError(
          dispatch,
          editing ? "Could not update product" : "Could not create product",
          "Please check the form and try again.",
        );
        return;
      }

      let working = saved;
      let uploadFailed = 0;
      const orderedMediaIds: string[] = [];

      for (const item of galleryItems) {
        if (item.kind === "saved") {
          orderedMediaIds.push(item.media.id);
          continue;
        }
        const uploadResult = await dispatch(
          uploadProductMedia({
            id: working.id,
            file: item.file,
            altText: working.name,
          }),
        );
        if (!uploadProductMedia.fulfilled.match(uploadResult)) {
          uploadFailed += 1;
          continue;
        }
        working = uploadResult.payload;
        const uploaded = working.media.find(
          (media) => !orderedMediaIds.includes(media.id),
        );
        if (uploaded) orderedMediaIds.push(uploaded.id);
      }

      if (
        orderedMediaIds.length > 0 &&
        orderedMediaIds.length === working.media.length
      ) {
        const reorderResult = await dispatch(
          reorderProductMedia({
            productId: working.id,
            mediaIds: orderedMediaIds,
          }),
        );
        if (reorderProductMedia.fulfilled.match(reorderResult)) {
          working = reorderResult.payload;
        }
      }

      setLiveProduct(working);

      if (uploadFailed > 0) {
        toastWarning(
          dispatch,
          "Product saved with media issues",
          `${uploadFailed} image(s) failed to upload.`,
        );
      } else {
        toastSuccess(
          dispatch,
          editing ? "Product updated" : "Product created",
          `${working.name} was saved.`,
        );
      }
      router.push("/?tab=products");
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }

  async function removeGalleryItem(item: GalleryItem) {
    if (item.kind === "pending") {
      URL.revokeObjectURL(item.url);
      setGalleryItems((current) => current.filter((row) => row.key !== item.key));
      return;
    }
    if (!liveProduct) {
      setGalleryItems((current) => current.filter((row) => row.key !== item.key));
      return;
    }
    const result = await dispatch(
      deleteProductMedia({ productId: liveProduct.id, mediaId: item.media.id }),
    );
    if (deleteProductMedia.fulfilled.match(result)) {
      syncGalleryFromProduct(result.payload);
      toastSuccess(dispatch, "Media removed");
    } else {
      toastError(dispatch, "Could not remove media");
    }
  }

  async function makePrimary(mediaId: string) {
    if (!liveProduct) return;
    const result = await dispatch(
      setPrimaryProductMedia({ productId: liveProduct.id, mediaId }),
    );
    if (setPrimaryProductMedia.fulfilled.match(result)) {
      syncGalleryFromProduct(result.payload);
      toastSuccess(dispatch, "Primary image updated");
    }
  }

  function generateVariants() {
    const attrs = attributes
      .filter((item) => item.name.trim())
      .map((item) => ({
        name: item.name.trim(),
        values: item.values
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      }))
      .filter((item) => item.values.length > 0);

    if (attrs.length === 0) {
      toastWarning(dispatch, "Add attributes first", "e.g. Size and Color values.");
      return;
    }

    const combos: Record<string, string>[] = [{}];
    for (const attr of attrs) {
      const next: Record<string, string>[] = [];
      for (const combo of combos) {
        for (const value of attr.values) {
          next.push({ ...combo, [attr.name]: value });
        }
      }
      combos.splice(0, combos.length, ...next);
    }

    const baseSku = (form.sku || form.name || "SKU")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24);

    setVariants(
      combos.map((options, index) => ({
        sku: `${baseSku || "SKU"}-${index + 1}`,
        price: form.price,
        stock: "0",
        optionsText: Object.entries(options)
          .map(([key, value]) => `${key}:${value}`)
          .join(", "),
        is_active: true,
      })),
    );
    toastSuccess(dispatch, "Variants generated", `${combos.length} variant(s) ready.`);
  }

  if (loadingProduct) {
    return (
      <div className="vz-card">
        <div className="vz-card-body text-center text-sm text-[var(--muted)]">
          Loading product…
        </div>
      </div>
    );
  }

  const primaryItem = galleryItems[0] ?? null;
  const primarySrc =
    primaryItem?.kind === "pending"
      ? primaryItem.url
      : primaryItem?.kind === "saved"
        ? (mediaUrl(primaryItem.media.thumbnail_url || primaryItem.media.url) ?? "")
        : "";

  return (
    <>
    <form onSubmit={submit} className="pb-4">
      <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-6">
        <div>
          <FormCard title="Product Title">
            <label className="block">
              <FieldLabel>Product Title</FieldLabel>
              <input
                className="form-input"
                required
                placeholder="Enter product title"
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
              />
              {!form.name.trim() ? (
                <p className="form-error">Please Enter a Product Title</p>
              ) : null}
            </label>
            <label className="mt-4 block">
              <FieldLabel>Product slug (optional)</FieldLabel>
              <input
                className="form-input"
                placeholder="auto-from-title"
                value={form.slug}
                onChange={(event) =>
                  setForm({ ...form, slug: event.target.value })
                }
              />
            </label>
          </FormCard>

          <FormCard title="Product Description">
            <div className="mb-3 flex flex-wrap gap-0 border border-[var(--card-border)] bg-[#f3f6f9]">
              {[
                { icon: Bold, action: () => wrapSelection("**", "**") },
                { icon: Italic, action: () => wrapSelection("_", "_") },
                { icon: Underline, action: () => wrapSelection("<u>", "</u>") },
                { icon: List, action: () => wrapSelection("\n- ", "") },
                { icon: ListOrdered, action: () => wrapSelection("\n1. ", "") },
                { icon: Link2, action: () => wrapSelection("[", "](https://)") },
              ].map(({ icon: Icon, action }, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={action}
                  className="border-r border-[var(--card-border)] p-2.5 text-[var(--muted)] last:border-r-0 hover:bg-white hover:text-[var(--primary)]"
                >
                  <Icon size={15} />
                </button>
              ))}
            </div>
            <textarea
              ref={descriptionRef}
              className="form-input min-h-52 resize-y"
              placeholder="Write a detailed product description…"
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
            />
          </FormCard>

          <FormCard title="Product Gallery">
            <div className="mb-5">
              <FieldLabel>Product Image</FieldLabel>
              <div className="grid max-w-[120px] gap-2">
                {primarySrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={primarySrc}
                    alt="Primary product"
                    className="vz-gallery-thumb"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="vz-dropzone min-h-[100px] p-3"
                  >
                    <ImagePlus size={18} />
                    <span className="text-xs">Add image</span>
                  </button>
                )}
              </div>
            </div>

            <div>
              <FieldLabel>Product Gallery</FieldLabel>
              <p className="mb-2 text-xs text-[var(--muted)]">
                Drag images to change order. First image is primary.
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="vz-dropzone min-h-[120px] py-6"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const files = Array.from(event.dataTransfer.files ?? []).filter(
                    (file) =>
                      [
                        "image/jpeg",
                        "image/png",
                        "image/webp",
                        "image/gif",
                        "image/avif",
                      ].includes(file.type) ||
                      /\.(jpe?g|png|webp|gif|avif)$/i.test(file.name),
                  );
                  if (files.length === 0) return;
                  setGalleryItems((current) => [
                    ...current,
                    ...files.map((file) => ({
                      key: nextGalleryKey("pending"),
                      kind: "pending" as const,
                      file,
                      url: URL.createObjectURL(file),
                    })),
                  ]);
                }}
              >
                <UploadCloud size={22} />
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  Drop files here or click to upload.
                </p>
                <p className="text-xs">
                  JPEG, PNG, WebP, GIF, or AVIF up to 10MB each
                </p>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/avif,.jpg,.jpeg,.png,.webp,.gif,.avif"
                multiple
                className="hidden"
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  setGalleryItems((current) => [
                    ...current,
                    ...files.map((file) => ({
                      key: nextGalleryKey("pending"),
                      kind: "pending" as const,
                      file,
                      url: URL.createObjectURL(file),
                    })),
                  ]);
                  event.target.value = "";
                }}
              />
            </div>

            {galleryItems.length > 0 && (
              <div className="mt-4 grid max-w-lg grid-cols-3 gap-2 sm:grid-cols-5">
                {galleryItems.map((item, index) => {
                  const src =
                    item.kind === "pending"
                      ? item.url
                      : (mediaUrl(
                          item.media.thumbnail_url ||
                            item.media.medium_url ||
                            item.media.url,
                        ) ?? "");
                  const isPrimary =
                    index === 0 ||
                    (item.kind === "saved" && item.media.is_primary);
                  return (
                    <div
                      key={item.key}
                      draggable
                      onDragStart={() => {
                        dragIndexRef.current = index;
                      }}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        const from = dragIndexRef.current;
                        dragIndexRef.current = null;
                        if (from == null) return;
                        moveGalleryItem(from, index);
                      }}
                      className={`gallery-item relative ${
                        item.kind === "pending" ? "gallery-item-pending" : ""
                      }`}
                      title="Drag to reorder"
                    >
                      <span className="gallery-item-handle" aria-hidden>
                        <GripVertical size={12} />
                      </span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={
                          item.kind === "pending"
                            ? item.file.name
                            : (item.media.alt_text ?? "Product media")
                        }
                        className="vz-gallery-thumb"
                      />
                      <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/55 p-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (item.kind === "saved") {
                              void makePrimary(item.media.id);
                              return;
                            }
                            moveGalleryItem(index, 0);
                          }}
                          className={`p-1 text-white ${
                            isPrimary ? "bg-[var(--brand)]" : ""
                          }`}
                          aria-label="Set as primary image"
                        >
                          <Star size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void removeGalleryItem(item)}
                          className="p-1 text-white hover:bg-[#f06548]"
                          aria-label="Remove image"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </FormCard>

          <FormCard title="General Info">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <FieldLabel>Brand</FieldLabel>
                <select
                  className="form-input"
                  value={form.brand_id}
                  onChange={(event) =>
                    setForm({ ...form, brand_id: event.target.value })
                  }
                >
                  <option value="">No brand</option>
                  {brands
                    .filter((brand) => brand.is_active || brand.id === String(form.brand_id))
                    .map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="block">
                <FieldLabel>Manufacturer Brand (text)</FieldLabel>
                <input
                  className="form-input"
                  placeholder="Optional free-text brand"
                  value={form.manufacturer_brand}
                  onChange={(event) =>
                    setForm({ ...form, manufacturer_brand: event.target.value })
                  }
                />
              </label>
              <label className="block">
                <FieldLabel>Manufacturer Name</FieldLabel>
                <input
                  className="form-input"
                  placeholder="Enter manufacturer name"
                  value={form.manufacturer_name}
                  onChange={(event) =>
                    setForm({ ...form, manufacturer_name: event.target.value })
                  }
                />
              </label>
              <label className="block">
                <FieldLabel>Stocks</FieldLabel>
                <input
                  className="form-input"
                  type="number"
                  min={0}
                  placeholder="Enter stocks"
                  value={form.stock}
                  onChange={(event) =>
                    setForm({ ...form, stock: event.target.value })
                  }
                />
              </label>
              <label className="block">
                <FieldLabel>SKU</FieldLabel>
                <input
                  className="form-input"
                  placeholder="Base SKU"
                  value={form.sku}
                  onChange={(event) =>
                    setForm({ ...form, sku: event.target.value })
                  }
                />
              </label>
              <label className="block">
                <FieldLabel>Price</FieldLabel>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                    $
                  </span>
                  <input
                    className="form-input pl-9"
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={form.price}
                    onChange={(event) =>
                      setForm({ ...form, price: event.target.value })
                    }
                  />
                </div>
              </label>
              <label className="block">
                <FieldLabel>Discount</FieldLabel>
                <div className="relative">
                  <input
                    className="form-input pr-9"
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    placeholder="0"
                    value={form.discount_percent}
                    onChange={(event) =>
                      setForm({ ...form, discount_percent: event.target.value })
                    }
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                    %
                  </span>
                </div>
              </label>
              <label className="block sm:col-span-2">
                <FieldLabel>Compare-at price</FieldLabel>
                <input
                  className="form-input"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Optional original price"
                  value={form.compare_at_price}
                  onChange={(event) =>
                    setForm({ ...form, compare_at_price: event.target.value })
                  }
                />
              </label>
            </div>
          </FormCard>

          <FormCard
            title="Attributes"
            action={
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const active = catalogAttributes.filter((item) => item.is_active);
                    if (active.length === 0) {
                      toastWarning(
                        dispatch,
                        "No catalog attributes",
                        "Create attributes under Ecommerce → Attributes first.",
                      );
                      return;
                    }
                    setAttributes(
                      active.map((item) => ({
                        name: item.name,
                        values: item.values.join(", "),
                      })),
                    );
                    toastSuccess(
                      dispatch,
                      "Attributes loaded",
                      `${active.length} attribute(s) from catalog.`,
                    );
                  }}
                  className="text-xs font-semibold text-[var(--brand)]"
                >
                  Load from catalog
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setAttributes((current) => [...current, { name: "", values: "" }])
                  }
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand)]"
                >
                  <Plus size={14} /> Add attribute
                </button>
              </div>
            }
          >
            <p className="mb-4 text-xs text-[var(--muted)]">
              VL-012 · Define options like Size and Color. Values are
              comma-separated.
            </p>
            <div className="space-y-3">
              {attributes.map((attr, index) => (
                <div
                  key={index}
                  className="grid gap-3 border border-[var(--card-border)] p-3 sm:grid-cols-[1fr_1.4fr_auto]"
                >
                  <input
                    className="form-input"
                    placeholder="Attribute name (Size)"
                    value={attr.name}
                    onChange={(event) => {
                      const next = [...attributes];
                      next[index] = { ...attr, name: event.target.value };
                      setAttributes(next);
                    }}
                  />
                  <input
                    className="form-input"
                    placeholder="Values (S, M, L)"
                    value={attr.values}
                    onChange={(event) => {
                      const next = [...attributes];
                      next[index] = { ...attr, values: event.target.value };
                      setAttributes(next);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setAttributes((current) =>
                        current.filter((_, i) => i !== index),
                      )
                    }
                    className="action-icon-btn action-icon-delete"
                    aria-label="Remove attribute"
                    title="Remove attribute"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </FormCard>

          <FormCard
            title="Variants"
            action={
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={generateVariants}
                  className="text-xs font-semibold text-[var(--brand)]"
                >
                  Generate from attributes
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setVariants((current) => [
                      ...current,
                      {
                        sku: "",
                        price: form.price,
                        stock: "0",
                        optionsText: "",
                        is_active: true,
                      },
                    ])
                  }
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand)]"
                >
                  <Plus size={14} /> Add variant
                </button>
              </div>
            }
          >
            <p className="mb-4 text-xs text-[var(--muted)]">
              VL-012 · Each variant needs a unique SKU. Options use{" "}
              <code className="bg-[#f3f6f9] px-1">Size:M, Color:Red</code>.
            </p>
            {variants.length === 0 ? (
              <p className="border border-dashed border-[var(--card-border)] px-4 py-8 text-center text-sm text-[var(--muted)]">
                No variants yet. Generate from attributes or add manually.
              </p>
            ) : (
              <div className="space-y-3">
                {variants.map((variant, index) => (
                  <div
                    key={index}
                    className="grid gap-3 border border-[var(--card-border)] p-3 lg:grid-cols-[1.1fr_1fr_0.7fr_0.6fr_auto]"
                  >
                    <input
                      className="form-input"
                      placeholder="Variant SKU"
                      required
                      value={variant.sku}
                      onChange={(event) => {
                        const next = [...variants];
                        next[index] = { ...variant, sku: event.target.value };
                        setVariants(next);
                      }}
                    />
                    <input
                      className="form-input"
                      placeholder="Size:M, Color:Red"
                      value={variant.optionsText}
                      onChange={(event) => {
                        const next = [...variants];
                        next[index] = {
                          ...variant,
                          optionsText: event.target.value,
                        };
                        setVariants(next);
                      }}
                    />
                    <input
                      className="form-input"
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="Price"
                      value={variant.price}
                      onChange={(event) => {
                        const next = [...variants];
                        next[index] = { ...variant, price: event.target.value };
                        setVariants(next);
                      }}
                    />
                    <input
                      className="form-input"
                      type="number"
                      min={0}
                      placeholder="Stock"
                      value={variant.stock}
                      onChange={(event) => {
                        const next = [...variants];
                        next[index] = { ...variant, stock: event.target.value };
                        setVariants(next);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setVariants((current) =>
                          current.filter((_, i) => i !== index),
                        )
                      }
                      className="action-icon-btn action-icon-delete"
                      aria-label="Remove variant"
                      title="Remove variant"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </FormCard>
        </div>

        <div>
          <FormCard title="Publish">
            <label className="block">
              <FieldLabel>Status</FieldLabel>
              <select
                className="form-input"
                value={form.is_published ? "published" : "draft"}
                onChange={(event) =>
                  setForm({
                    ...form,
                    is_published: event.target.value === "published",
                  })
                }
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>
            <label className="mt-4 block">
              <FieldLabel>Visibility</FieldLabel>
              <select
                className="form-input"
                value={form.visibility}
                onChange={(event) =>
                  setForm({ ...form, visibility: event.target.value })
                }
              >
                <option value="public">Public</option>
                <option value="catalog">Catalog</option>
                <option value="hidden">Hidden</option>
              </select>
            </label>
            <label className="mt-4 flex items-center justify-between border border-[var(--card-border)] px-3 py-3 text-sm font-medium">
              Active
              <input
                type="checkbox"
                role="switch"
                checked={form.is_active}
                onChange={(event) =>
                  setForm({ ...form, is_active: event.target.checked })
                }
                className="form-switch"
              />
            </label>
            <label className="mt-3 flex items-center justify-between border border-[var(--card-border)] px-3 py-3 text-sm font-medium">
              Featured
              <input
                type="checkbox"
                role="switch"
                checked={form.is_featured}
                onChange={(event) =>
                  setForm({ ...form, is_featured: event.target.checked })
                }
                className="form-switch"
              />
            </label>
            <label className="mt-3 flex items-center justify-between border border-[var(--card-border)] px-3 py-3 text-sm font-medium">
              Trending
              <input
                type="checkbox"
                role="switch"
                checked={form.is_trending}
                onChange={(event) =>
                  setForm({ ...form, is_trending: event.target.checked })
                }
                className="form-switch"
              />
            </label>
            <label className="mt-3 flex items-center justify-between border border-[var(--card-border)] px-3 py-3 text-sm font-medium">
              Best seller
              <input
                type="checkbox"
                role="switch"
                checked={form.is_best_seller}
                onChange={(event) =>
                  setForm({ ...form, is_best_seller: event.target.checked })
                }
                className="form-switch"
              />
            </label>
            <label className="mt-3 flex items-center justify-between border border-[var(--card-border)] px-3 py-3 text-sm font-medium">
              Exchangeable
              <input
                type="checkbox"
                role="switch"
                checked={form.exchangeable}
                onChange={(event) =>
                  setForm({ ...form, exchangeable: event.target.checked })
                }
                className="form-switch"
              />
            </label>
            <label className="mt-3 flex items-center justify-between border border-[var(--card-border)] px-3 py-3 text-sm font-medium">
              Refundable
              <input
                type="checkbox"
                role="switch"
                checked={form.refundable}
                onChange={(event) =>
                  setForm({ ...form, refundable: event.target.checked })
                }
                className="form-switch"
              />
            </label>
          </FormCard>

          <FormCard title="Publish Schedule">
            <label className="block">
              <FieldLabel>Publish Date & Time</FieldLabel>
              <input
                className="form-input"
                type="datetime-local"
                value={form.published_at}
                onChange={(event) =>
                  setForm({ ...form, published_at: event.target.value })
                }
              />
            </label>
          </FormCard>

          <FormCard
            title="Product Categories"
            action={
              <button
                type="button"
                onClick={() => setCategoryModalOpen(true)}
                className="text-xs font-semibold text-[var(--brand)]"
              >
                Add New
              </button>
            }
          >
            <select
              className="form-input"
              value={form.category_id}
              onChange={(event) =>
                setForm({ ...form, category_id: event.target.value })
              }
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </FormCard>

          <FormCard title="Product Tags">
            <TagsMultiInput
              value={form.tags}
              onChange={(tags) => setForm({ ...form, tags })}
            />
            <p className="mt-2 text-xs text-[var(--muted)]">
              Type a tag and press Enter to add
            </p>
          </FormCard>

          <FormCard title="Product Short Description">
            <textarea
              className="form-input min-h-32 resize-y"
              placeholder="Must enter minimum of 100 characters"
              value={form.short_description}
              onChange={(event) =>
                setForm({ ...form, short_description: event.target.value })
              }
            />
            <p
              className={`mt-2 text-xs ${
                shortDescCount > 0 && shortDescCount < 100
                  ? "text-[#f7b84b]"
                  : "text-[var(--muted)]"
              }`}
            >
              Must enter minimum of 100 characters
              {shortDescCount > 0 ? ` · ${shortDescCount}/100` : ""}
            </p>
          </FormCard>
        </div>
      </div>

      <div className="product-form-footer">
        <div className="product-form-footer-inner">
          <Link href="/?tab=products" className="glass-secondary-button">
            Discard
          </Link>
          <button type="submit" disabled={busy} className="primary-button">
            {busy ? "Saving…" : "Submit"}
          </button>
        </div>
      </div>
    </form>

    <CategoryFormModal
      category={categoryModalOpen ? "new" : null}
      categories={categories}
      onClose={() => setCategoryModalOpen(false)}
      onSaved={async (saved) => {
        await dispatch(fetchCategories());
        setForm((current) => ({
          ...current,
          category_id: String(saved.id),
        }));
      }}
    />
    </>
  );
}
