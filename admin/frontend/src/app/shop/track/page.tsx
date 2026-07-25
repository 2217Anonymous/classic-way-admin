"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

import { ShipmentTimeline } from "@/components/storefront/ShipmentTimeline";
import type { Order } from "@/lib/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchOrderByNumber } from "@/store/ordersSlice";
import { fetchShipments } from "@/store/shipmentsSlice";

function TrackContent() {
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const orders = useAppSelector((state) => state.orders.items);
  const shipments = useAppSelector((state) => state.shipments.items);
  const [orderNumber, setOrderNumber] = useState(searchParams.get("order") ?? "");
  const [searched, setSearched] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void dispatch(fetchShipments());
  }, [dispatch]);

  async function runSearch(value: string) {
    if (!value.trim()) return;
    setLoading(true);
    setSearched(true);
    const result = await dispatch(fetchOrderByNumber(value.trim()));
    setLoading(false);
    setNotFound(!fetchOrderByNumber.fulfilled.match(result));
  }

  useEffect(() => {
    const prefill = searchParams.get("order");
    if (prefill) void runSearch(prefill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    void runSearch(orderNumber);
  }

  const order: Order | undefined = useMemo(
    () =>
      orders.find(
        (item) => item.order_number.toUpperCase() === orderNumber.trim().toUpperCase(),
      ),
    [orders, orderNumber],
  );

  const shipment = useMemo(
    () => (order ? shipments.find((item) => item.order_id === order.id) : undefined),
    [order, shipments],
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="table-card p-6 text-center sm:p-8">
        <h1 className="text-2xl font-bold">Track your order</h1>
        <p className="mt-1 text-sm text-slate-600">
          Enter your order number to see the latest delivery status.
        </p>
        <form onSubmit={submit} className="mx-auto mt-5 flex max-w-md gap-2">
          <input
            className="form-input"
            placeholder="e.g. CW-1001"
            value={orderNumber}
            onChange={(event) => setOrderNumber(event.target.value)}
          />
          <button type="submit" disabled={loading} className="primary-button">
            <Search size={16} /> {loading ? "Searching..." : "Track"}
          </button>
        </form>
      </section>

      {searched && !loading && notFound && (
        <p className="p-6 text-center text-sm text-slate-500">
          We couldn&apos;t find an order with that number. Please check and try again.
        </p>
      )}

      {order && (
        <section className="table-card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Order</p>
              <p className="text-lg font-bold">{order.order_number}</p>
            </div>
            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
              {order.status}
            </span>
          </div>

          {shipment ? (
            <ShipmentTimeline shipment={shipment} />
          ) : (
            <p className="border border-[var(--card-border)] p-4 text-sm text-slate-600">
              Your order is being processed. Shipment tracking will appear here once it ships.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<p className="p-12 text-center text-sm text-slate-500">Loading…</p>}>
      <TrackContent />
    </Suspense>
  );
}
