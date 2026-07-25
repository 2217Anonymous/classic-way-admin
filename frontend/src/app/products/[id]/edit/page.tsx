"use client";

import { Suspense, use } from "react";

import { AdminShell } from "@/components/AdminShell";
import { AuthGate } from "@/components/AuthGate";
import { ProductFormPage } from "@/components/ProductFormPage";

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const productId = Number(id);

  return (
    <AuthGate>
      <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>
        <AdminShell
          activeNav="products"
          title="Edit Product"
          breadcrumbs={[
            { label: "Ecommerce", href: "/?tab=products" },
            { label: "Edit Product" },
          ]}
        >
          <ProductFormPage
            productId={Number.isFinite(productId) ? productId : undefined}
          />
        </AdminShell>
      </Suspense>
    </AuthGate>
  );
}
