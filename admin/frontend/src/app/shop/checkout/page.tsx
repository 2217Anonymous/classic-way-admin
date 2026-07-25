"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { CreditCard, Truck } from "lucide-react";

import { toastError, toastSuccess } from "@/lib/toast";
import type { PaymentMethod } from "@/lib/types";
import { fetchAddresses } from "@/store/addressesSlice";
import { clearCart, ensureCart } from "@/store/cartSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { createOrder } from "@/store/ordersSlice";

function formatCurrency(value: number) {
  return `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default function CheckoutPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { cart } = useAppSelector((state) => state.cart);
  const { items: savedAddresses } = useAppSelector((state) => state.addresses);
  const [selectedAddressId, setSelectedAddressId] = useState<number | "new">("new");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("razorpay");
  const [placing, setPlacing] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    line1: "",
    line2: "",
    city: "",
    state: "Tamil Nadu",
    postal_code: "",
    country: "India",
  });

  useEffect(() => {
    void dispatch(ensureCart());
    void dispatch(fetchAddresses());
  }, [dispatch]);

  useEffect(() => {
    if (savedAddresses.length === 0) return;
    const defaultAddress = savedAddresses.find((address) => address.is_default) ?? savedAddresses[0];
    setSelectedAddressId(defaultAddress.id);
  }, [savedAddresses]);

  useEffect(() => {
    if (selectedAddressId === "new") return;
    const address = savedAddresses.find((item) => item.id === selectedAddressId);
    if (!address) return;
    setForm({
      full_name: address.full_name,
      phone: address.phone,
      email: address.email ?? "",
      line1: address.line1,
      line2: address.line2 ?? "",
      city: address.city,
      state: address.state,
      postal_code: address.postal_code,
      country: address.country,
    });
  }, [selectedAddressId, savedAddresses]);

  const subtotal = cart?.subtotal ?? 0;
  const discount = cart?.discount_total ?? 0;
  const taxable = Math.max(0, subtotal - discount);
  const shipping = useMemo(() => (taxable > 999 ? 0 : 60), [taxable]);
  const tax = useMemo(() => Math.round(taxable * 0.05 * 100) / 100, [taxable]);
  const grandTotal = Math.round((taxable + shipping + tax) * 100) / 100;

  async function placeOrder(event: FormEvent) {
    event.preventDefault();
    if (!cart || cart.items.length === 0) return;
    setPlacing(true);
    const result = await dispatch(
      createOrder({
        customer_name: form.full_name,
        customer_email: form.email || null,
        customer_phone: form.phone,
        items: cart.items.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          product_slug: item.product_slug,
          variant_id: item.variant_id,
          variant_label: item.variant_label,
          sku: item.sku,
          image_url: item.image_url,
          unit_price: item.unit_price,
          quantity: item.quantity,
        })),
        shipping_address: {
          full_name: form.full_name,
          phone: form.phone,
          email: form.email || null,
          line1: form.line1,
          line2: form.line2 || null,
          city: form.city,
          state: form.state,
          postal_code: form.postal_code,
          country: form.country,
        },
        payment_method: paymentMethod,
        coupon_code: cart.coupon_code,
        discount_total: discount,
        shipping_total: shipping,
        tax_total: tax,
      }),
    );
    setPlacing(false);
    if (createOrder.fulfilled.match(result)) {
      await dispatch(clearCart());
      toastSuccess(dispatch, "Order placed", `${result.payload.order_number} confirmed.`);
      router.push(`/shop/orders/${result.payload.order_number}`);
    } else {
      toastError(dispatch, "Could not place order", "Please check the form and try again.");
    }
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="space-y-4 border border-[var(--card-border)] bg-white p-12 text-center">
        <p className="text-sm text-slate-500">Your cart is empty. Add items before checking out.</p>
        <Link href="/shop" className="primary-button inline-flex">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={placeOrder} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        <section className="table-card p-5">
          <h2 className="mb-4 text-lg font-bold">Delivery address</h2>

          {savedAddresses.length > 0 && (
            <div className="mb-4 space-y-2">
              {savedAddresses.map((address) => (
                <label
                  key={address.id}
                  className={`flex cursor-pointer items-start gap-3 border p-3 text-sm transition ${
                    selectedAddressId === address.id
                      ? "border-[var(--theme-green)] bg-[var(--theme-green-soft)]"
                      : "border-[var(--card-border)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="address"
                    className="mt-1"
                    checked={selectedAddressId === address.id}
                    onChange={() => setSelectedAddressId(address.id)}
                  />
                  <span>
                    <span className="block font-semibold">{address.full_name}</span>
                    <span className="block text-slate-600">
                      {address.line1}, {address.city}, {address.state} {address.postal_code}
                    </span>
                  </span>
                </label>
              ))}
              <label
                className={`flex cursor-pointer items-center gap-3 border p-3 text-sm font-semibold transition ${
                  selectedAddressId === "new"
                    ? "border-[var(--theme-green)] bg-[var(--theme-green-soft)]"
                    : "border-[var(--card-border)]"
                }`}
              >
                <input
                  type="radio"
                  name="address"
                  checked={selectedAddressId === "new"}
                  onChange={() => setSelectedAddressId("new")}
                />
                Use a new address
              </label>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="vz-label">Full name</span>
              <input
                className="form-input"
                required
                value={form.full_name}
                onChange={(event) => setForm({ ...form, full_name: event.target.value })}
              />
            </label>
            <label className="block">
              <span className="vz-label">Phone</span>
              <input
                className="form-input"
                required
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="vz-label">Email (optional)</span>
              <input
                className="form-input"
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="vz-label">Address line 1</span>
              <input
                className="form-input"
                required
                value={form.line1}
                onChange={(event) => setForm({ ...form, line1: event.target.value })}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="vz-label">Address line 2 (optional)</span>
              <input
                className="form-input"
                value={form.line2}
                onChange={(event) => setForm({ ...form, line2: event.target.value })}
              />
            </label>
            <label className="block">
              <span className="vz-label">City</span>
              <input
                className="form-input"
                required
                value={form.city}
                onChange={(event) => setForm({ ...form, city: event.target.value })}
              />
            </label>
            <label className="block">
              <span className="vz-label">State</span>
              <input
                className="form-input"
                required
                value={form.state}
                onChange={(event) => setForm({ ...form, state: event.target.value })}
              />
            </label>
            <label className="block">
              <span className="vz-label">Postal code</span>
              <input
                className="form-input"
                required
                value={form.postal_code}
                onChange={(event) => setForm({ ...form, postal_code: event.target.value })}
              />
            </label>
            <label className="block">
              <span className="vz-label">Country</span>
              <input
                className="form-input"
                required
                value={form.country}
                onChange={(event) => setForm({ ...form, country: event.target.value })}
              />
            </label>
          </div>
        </section>

        <section className="table-card p-5">
          <h2 className="mb-4 text-lg font-bold">Payment method</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label
              className={`flex cursor-pointer items-center gap-3 border p-3.5 text-sm font-semibold transition ${
                paymentMethod === "razorpay"
                  ? "border-[var(--theme-green)] bg-[var(--theme-green-soft)] text-[var(--theme-green)]"
                  : "border-[var(--card-border)]"
              }`}
            >
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === "razorpay"}
                onChange={() => setPaymentMethod("razorpay")}
              />
              <CreditCard size={18} /> Pay online (Razorpay)
            </label>
            <label
              className={`flex cursor-pointer items-center gap-3 border p-3.5 text-sm font-semibold transition ${
                paymentMethod === "cod"
                  ? "border-[var(--theme-green)] bg-[var(--theme-green-soft)] text-[var(--theme-green)]"
                  : "border-[var(--card-border)]"
              }`}
            >
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === "cod"}
                onChange={() => setPaymentMethod("cod")}
              />
              <Truck size={18} /> Cash on delivery
            </label>
          </div>
        </section>
      </div>

      <aside className="table-card h-fit space-y-4 p-5">
        <h2 className="text-lg font-bold">Order summary</h2>
        <div className="max-h-56 space-y-3 overflow-y-auto">
          {cart.items.map((item) => (
            <div key={item.id} className="flex justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">
                {item.product_name} × {item.quantity}
              </span>
              <span className="shrink-0 font-medium">{formatCurrency(item.line_total)}</span>
            </div>
          ))}
        </div>
        <div className="space-y-1.5 border-t border-[var(--card-border)] pt-3 text-sm">
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
          <div className="flex justify-between text-slate-600">
            <span>Shipping</span>
            <span>{shipping === 0 ? "Free" : formatCurrency(shipping)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Tax (5%)</span>
            <span>{formatCurrency(tax)}</span>
          </div>
          <div className="flex justify-between border-t border-[var(--card-border)] pt-2 text-base font-bold">
            <span>Total</span>
            <span>{formatCurrency(grandTotal)}</span>
          </div>
        </div>
        <button type="submit" disabled={placing} className="primary-button w-full justify-center py-3">
          {placing ? "Placing order..." : "Place order"}
        </button>
      </aside>
    </form>
  );
}
