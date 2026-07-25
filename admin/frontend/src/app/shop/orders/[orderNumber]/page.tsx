"use client";

import Link from "next/link";
import { use, useEffect } from "react";
import { CheckCircle2, PackageSearch } from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchOrderByNumber } from "@/store/ordersSlice";

function formatCurrency(value: number) {
  return `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = use(params);
  const dispatch = useAppDispatch();
  const { items, loading } = useAppSelector((state) => state.orders);

  useEffect(() => {
    void dispatch(fetchOrderByNumber(orderNumber));
  }, [dispatch, orderNumber]);

  const order = items.find(
    (item) => item.order_number.toUpperCase() === orderNumber.toUpperCase(),
  );

  if (loading && !order) {
    return <p className="p-12 text-center text-sm text-slate-500">Loading order…</p>;
  }

  if (!order) {
    return (
      <div className="space-y-4 border border-[var(--card-border)] bg-white p-12 text-center">
        <p className="text-sm text-slate-500">We couldn&apos;t find order {orderNumber}.</p>
        <Link href="/shop" className="primary-button inline-flex">
          Back to shop
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="table-card flex flex-col items-center gap-3 p-8 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-[var(--theme-green-soft)] text-[var(--theme-green)]">
          <CheckCircle2 size={28} />
        </span>
        <h1 className="text-2xl font-bold">Thank you, {order.customer_name.split(" ")[0]}!</h1>
        <p className="text-sm text-slate-600">
          Your order <span className="font-semibold">{order.order_number}</span> has been placed
          successfully.
        </p>
        <p className="text-xs text-slate-400">Placed on {formatDate(order.placed_at)}</p>
      </section>

      <section className="table-card p-5">
        <h2 className="mb-3 text-lg font-bold">Order details</h2>
        <div className="divide-y divide-slate-100">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{item.product_name}</p>
                {item.variant_label && <p className="text-xs text-slate-500">{item.variant_label}</p>}
                <p className="text-xs text-slate-500">Qty {item.quantity}</p>
              </div>
              <p className="shrink-0 font-semibold">{formatCurrency(item.line_total)}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-1.5 border-t border-[var(--card-border)] pt-3 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          {order.discount_total > 0 && (
            <div className="flex justify-between text-[var(--theme-green)]">
              <span>Discount</span>
              <span>-{formatCurrency(order.discount_total)}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-600">
            <span>Shipping</span>
            <span>{order.shipping_total === 0 ? "Free" : formatCurrency(order.shipping_total)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Tax</span>
            <span>{formatCurrency(order.tax_total)}</span>
          </div>
          <div className="flex justify-between border-t border-[var(--card-border)] pt-2 text-base font-bold">
            <span>Total</span>
            <span>{formatCurrency(order.grand_total)}</span>
          </div>
        </div>
      </section>

      <section className="table-card p-5">
        <h2 className="mb-2 text-lg font-bold">Shipping to</h2>
        <p className="text-sm font-medium">{order.shipping_address.full_name}</p>
        <p className="text-sm text-slate-600">
          {order.shipping_address.line1}
          {order.shipping_address.line2 ? `, ${order.shipping_address.line2}` : ""}
        </p>
        <p className="text-sm text-slate-600">
          {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Payment: <span className="capitalize">{order.payment_method === "cod" ? "Cash on delivery" : "Razorpay"}</span>
          {" · "}
          <span className="capitalize">{order.payment_status}</span>
        </p>
      </section>

      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href={`/shop/track?order=${order.order_number}`}
          className="primary-button"
        >
          <PackageSearch size={16} /> Track this order
        </Link>
        <Link href="/shop" className="glass-secondary-button">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
