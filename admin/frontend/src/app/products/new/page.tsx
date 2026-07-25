"use client";

import { Suspense } from "react";

import { AdminShell } from "@/components/AdminShell";
import { AuthGate } from "@/components/AuthGate";
import { ProductFormPage } from "@/components/ProductFormPage";

export default function NewProductPage() {
  return (
    <AuthGate>
      <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>
        <AdminShell
          activeNav="products"
          title="Create Product"
          breadcrumbs={[
            { label: "Ecommerce", href: "/?tab=products" },
            { label: "Create Product" },
          ]}
        >
          <ProductFormPage />
        </AdminShell>
      </Suspense>
    </AuthGate>
  );
}
