"use client";

import { Suspense, use } from "react";

import { AdminShell } from "@/components/AdminShell";
import { AuthGate } from "@/components/AuthGate";
import { ProductDetailsPage } from "@/components/ProductDetailsPage";

export default function ProductDetailRoute({
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
          title="Product Details"
          breadcrumbs={[
            { label: "Ecommerce", href: "/?tab=products" },
            { label: "Product Details" },
          ]}
        >
          {Number.isFinite(productId) ? (
            <ProductDetailsPage productId={productId} />
          ) : (
            <p className="text-sm text-[var(--muted)]">Invalid product.</p>
          )}
        </AdminShell>
      </Suspense>
    </AuthGate>
  );
}
