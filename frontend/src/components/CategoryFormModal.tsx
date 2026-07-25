"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { FolderTree, ImagePlus } from "lucide-react";

import { Modal } from "@/components/Modal";
import { mediaUrl } from "@/lib/api";
import { toastError, toastSuccess, toastWarning } from "@/lib/toast";
import type { Category, CategoryInput } from "@/lib/types";
import {
  createCategory,
  updateCategory,
  uploadCategoryImage,
} from "@/store/categoriesSlice";
import { useAppDispatch } from "@/store/hooks";

export function CategoryFormModal({
  category,
  categories,
  onClose,
  onSaved,
}: {
  category: Category | "new" | null;
  categories: Category[];
  onClose: () => void;
  onSaved: (saved: Category) => Promise<void> | void;
}) {
  const dispatch = useAppDispatch();
  const editing = category !== null && category !== "new";
  const [busy, setBusy] = useState(false);
  const submittingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    parent_id: "" as string,
    is_active: true,
    sort_order: "0",
  });

  const parentOptions = useMemo(() => {
    if (!editing) return categories;
    return categories.filter((item) => item.id !== category.id);
  }, [categories, category, editing]);

  useEffect(() => {
    if (!category) return;
    submittingRef.current = false;
    setBusy(false);
    setImageFile(null);
    setPreviewUrl(category === "new" ? null : mediaUrl(category.image_url));
    setForm(
      category === "new"
        ? {
            name: "",
            slug: "",
            description: "",
            parent_id: "",
            is_active: true,
            sort_order: "0",
          }
        : {
            name: category.name,
            slug: category.slug,
            description: category.description || "",
            parent_id: category.parent_id ? String(category.parent_id) : "",
            is_active: category.is_active,
            sort_order: String(category.sort_order),
          },
    );
  }, [category]);

  useEffect(() => {
    if (!imageFile) return;
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (submittingRef.current || busy) return;
    submittingRef.current = true;
    setBusy(true);
    const payload: CategoryInput = {
      name: form.name,
      slug: form.slug || undefined,
      description: form.description || undefined,
      parent_id: form.parent_id ? Number(form.parent_id) : null,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    };
    try {
      let saved: Category | null = null;
      if (category === "new") {
        const result = await dispatch(createCategory(payload));
        if (createCategory.fulfilled.match(result)) saved = result.payload;
      } else if (category) {
        const result = await dispatch(
          updateCategory({ id: category.id, changes: payload }),
        );
        if (updateCategory.fulfilled.match(result)) saved = result.payload;
      }

      if (!saved) {
        toastError(
          dispatch,
          editing ? "Could not update category" : "Could not create category",
          "Please check the form and try again.",
        );
        return;
      }

      if (imageFile) {
        const uploadResult = await dispatch(
          uploadCategoryImage({ id: saved.id, file: imageFile }),
        );
        if (!uploadCategoryImage.fulfilled.match(uploadResult)) {
          toastWarning(
            dispatch,
            "Category saved without image",
            uploadResult.error?.message ?? "Image upload failed.",
          );
          await onSaved(saved);
          onClose();
          return;
        }
        saved = uploadResult.payload;
      }

      toastSuccess(
        dispatch,
        editing ? "Category updated" : "Category created",
        form.parent_id
          ? `${saved.name} nested under parent.`
          : `${saved.name} saved as root.`,
      );
      await onSaved(saved);
      onClose();
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }

  return (
    <Modal
      open={Boolean(category)}
      title={editing ? "Edit category" : "Create category"}
      description="Choose a parent to nest in the tree, or leave Root for a top-level category."
      onClose={onClose}
      size="lg"
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="relative">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Category preview"
                className="size-20 rounded-full object-cover ring-4 ring-white shadow-md"
              />
            ) : (
              <span className="grid size-20 place-items-center rounded-full bg-neutral-100 text-neutral-900 ring-4 ring-white shadow-md">
                <FolderTree size={28} />
              </span>
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="glass-secondary-button inline-flex items-center gap-2"
            >
              <ImagePlus size={16} />
              {previewUrl ? "Change image" : "Upload image"}
            </button>
            <p className="mt-2 text-xs text-slate-500">
              JPEG, PNG, or WebP up to 2MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setImageFile(file);
              }}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Name
            </span>
            <input
              className="form-input"
              required
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Slug (optional)
            </span>
            <input
              className="form-input"
              placeholder="auto-from-name"
              value={form.slug}
              onChange={(event) =>
                setForm({ ...form, slug: event.target.value })
              }
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Description
            </span>
            <textarea
              className="form-input min-h-24 resize-y"
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Parent category (tree nest)
            </span>
            <select
              className="form-input"
              value={form.parent_id}
              onChange={(event) =>
                setForm({ ...form, parent_id: event.target.value })
              }
            >
              <option value="">Root (top level)</option>
              {parentOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-slate-500">
              Select a parent to show this category under it in the tree.
            </span>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Sort order
            </span>
            <input
              className="form-input"
              type="number"
              min={0}
              value={form.sort_order}
              onChange={(event) =>
                setForm({ ...form, sort_order: event.target.value })
              }
            />
          </label>
          <button
            type="button"
            onClick={() => setForm({ ...form, is_active: !form.is_active })}
            className={`form-input flex items-center justify-between sm:col-span-2 ${
              form.is_active ? "text-emerald-700" : "text-slate-500"
            }`}
          >
            {form.is_active ? "Active" : "Inactive"}
            <span
              className={`h-6 w-11 rounded-full p-1 transition ${
                form.is_active ? "bg-emerald-500" : "bg-slate-300"
              }`}
            >
              <span
                className={`block size-4 rounded-full bg-white transition ${
                  form.is_active ? "translate-x-5" : ""
                }`}
              />
            </span>
          </button>
        </div>
        <div className="flex flex-col-reverse gap-3 border-t border-slate-200/70 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="glass-secondary-button"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="primary-button justify-center"
          >
            {busy ? "Saving..." : editing ? "Save changes" : "Create category"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
