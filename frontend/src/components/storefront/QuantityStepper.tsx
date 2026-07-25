"use client";

import { Minus, Plus } from "lucide-react";

export function QuantityStepper({
  quantity,
  onChange,
  min = 1,
  max = 20,
}: {
  quantity: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="inline-flex items-center border border-[var(--card-border)]">
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={quantity <= min}
        onClick={() => onChange(Math.max(min, quantity - 1))}
        className="grid size-9 place-items-center text-slate-600 transition hover:bg-[var(--theme-green-soft)] hover:text-[var(--theme-green)] disabled:opacity-40"
      >
        <Minus size={14} />
      </button>
      <span className="min-w-[2.5rem] text-center text-sm font-semibold">{quantity}</span>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={quantity >= max}
        onClick={() => onChange(Math.min(max, quantity + 1))}
        className="grid size-9 place-items-center text-slate-600 transition hover:bg-[var(--theme-green-soft)] hover:text-[var(--theme-green)] disabled:opacity-40"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
