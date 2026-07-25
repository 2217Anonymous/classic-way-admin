"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

import { QuantityStepper } from "@/components/storefront/QuantityStepper";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  applyCartCoupon,
  ensureCart,
  removeCartCoupon,
  removeCartItem,
  updateCartItemQuantity,
} from "@/store/cartSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

function formatCurrency(value: number) {
  return `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default function CartPage() {
  const dispatch = useAppDispatch();
  const { cart, loading } = useAppSelector((state) => state.cart);
  const [couponInput, setCouponInput] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);

  useEffect(() => {
    void dispatch(ensureCart());
  }, [dispatch]);

  const items = cart?.items ?? [];
  const subtotal = cart?.subtotal ?? 0;
  const discount = cart?.discount_total ?? 0;
  const total = Math.max(0, subtotal - discount);

  async function applyCoupon(event: FormEvent) {
    event.preventDefault();
    if (!couponInput.trim()) return;
    setCouponBusy(true);
    const result = await dispatch(applyCartCoupon(couponInput.trim()));
    setCouponBusy(false);
    if (applyCartCoupon.fulfilled.match(result)) {
      toastSuccess(dispatch, "Coupon applied", `${couponInput.trim().toUpperCase()} applied to your order.`);
      setCouponInput("");
    } else {
      toastError(dispatch, "Invalid coupon", result.error?.message ?? "Please check the code and try again.");
    }
  }

  async function removeCoupon() {
    await dispatch(removeCartCoupon());
  }

  if (loading && !cart) {
    return <p className="p-12 text-center text-sm text-slate-500">Loading cart…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="space-y-4 border border-[var(--card-border)] bg-white p-12 text-center">
        <p className="text-sm text-slate-500">Your cart is empty.</p>
        <Link href="/shop" className="primary-button inline-flex">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="table-card">
        <div className="border-b border-[var(--card-border)] px-5 py-4">
          <h1 className="text-lg font-bold">Your cart</h1>
        </div>
        <div className="divide-y divide-slate-100">
          {items.map((item) => (
            <div key={item.id} className="flex gap-4 p-4 sm:p-5">
              <div className="size-20 shrink-0 overflow-hidden border border-[var(--card-border)] bg-slate-50">
                {item.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image_url} alt={item.product_name} className="size-full object-cover" />
                ) : null}
              </div>
              <div className="flex flex-1 flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <Link href={`/shop/${item.product_slug}`} className="font-semibold hover:text-[var(--theme-green)]">
                    {item.product_name}
                  </Link>
                  {item.variant_label && (
                    <p className="text-xs text-slate-500">{item.variant_label}</p>
                  )}
                  <p className="mt-1 text-sm font-semibold">{formatCurrency(item.unit_price)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <QuantityStepper
                    quantity={item.quantity}
                    onChange={(next) => void dispatch(updateCartItemQuantity({ itemId: item.id, quantity: next }))}
                  />
                  <p className="w-20 text-right font-semibold">{formatCurrency(item.line_total)}</p>
                  <button
                    type="button"
                    aria-label={`Remove ${item.product_name}`}
                    onClick={() => void dispatch(removeCartItem(item.id))}
                    className="icon-button border border-[var(--card-border)] hover:text-[#f06548]"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <aside className="table-card h-fit space-y-4 p-5">
        <h2 className="text-lg font-bold">Order summary</h2>

        {cart?.coupon_code ? (
          <div className="flex items-center justify-between border border-[var(--theme-green)] bg-[var(--theme-green-soft)] px-3 py-2 text-sm font-semibold text-[var(--theme-green)]">
            <span>{cart.coupon_code}</span>
            <button type="button" onClick={() => void removeCoupon()} className="underline">
              Remove
            </button>
          </div>
        ) : (
          <form onSubmit={applyCoupon} className="flex gap-2">
            <input
              className="form-input"
              placeholder="Coupon code"
              value={couponInput}
              onChange={(event) => setCouponInput(event.target.value)}
            />
            <button type="submit" disabled={couponBusy} className="glass-secondary-button">
              Apply
            </button>
          </form>
        )}

        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-[var(--theme-green)]">
              <span>Discount</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-500">
            <span>Shipping &amp; tax</span>
            <span>Calculated at checkout</span>
          </div>
          <div className="flex justify-between border-t border-[var(--card-border)] pt-2 text-base font-bold">
            <span>Estimated total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        <Link href="/shop/checkout" className="primary-button w-full justify-center py-3">
          Proceed to checkout
        </Link>
      </aside>
    </div>
  );
}
