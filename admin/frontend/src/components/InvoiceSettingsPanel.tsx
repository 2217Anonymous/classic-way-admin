"use client";

import { FormEvent, useEffect, useState } from "react";

import { toastSuccess } from "@/lib/toast";
import { useAppDispatch } from "@/store/hooks";

const STORAGE_KEY = "cw_invoice_settings";

type InvoiceForm = {
  company_name: string;
  gstin: string;
  invoice_prefix: string;
  next_number: string;
  footer_note: string;
  show_tax_breakdown: boolean;
};

const defaults: InvoiceForm = {
  company_name: "Classic Way Retail Pvt Ltd",
  gstin: "33AAAAA0000A1Z5",
  invoice_prefix: "CW-INV-",
  next_number: "1001",
  footer_note: "Thank you for shopping with Classic Way.",
  show_tax_breakdown: true,
};

function loadForm(): InvoiceForm {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

export function InvoiceSettingsPanel() {
  const dispatch = useAppDispatch();
  const [form, setForm] = useState<InvoiceForm>(defaults);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setForm(loadForm());
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    setBusy(false);
    toastSuccess(dispatch, "Invoice settings saved", "Invoice preferences updated.");
  }

  return (
    <section className="vz-card max-w-2xl">
      <div className="vz-card-header">
        <h2 className="vz-card-title">Invoice settings</h2>
      </div>
      <form onSubmit={submit} className="vz-card-body space-y-4">
        <label className="block">
          <span className="vz-label">Company name on invoice</span>
          <input
            className="form-input"
            required
            value={form.company_name}
            onChange={(event) =>
              setForm({ ...form, company_name: event.target.value })
            }
          />
        </label>
        <label className="block">
          <span className="vz-label">GSTIN</span>
          <input
            className="form-input"
            value={form.gstin}
            onChange={(event) => setForm({ ...form, gstin: event.target.value })}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="vz-label">Invoice prefix</span>
            <input
              className="form-input"
              required
              value={form.invoice_prefix}
              onChange={(event) =>
                setForm({ ...form, invoice_prefix: event.target.value })
              }
            />
          </label>
          <label className="block">
            <span className="vz-label">Next number</span>
            <input
              className="form-input"
              type="number"
              min={1}
              required
              value={form.next_number}
              onChange={(event) =>
                setForm({ ...form, next_number: event.target.value })
              }
            />
          </label>
        </div>
        <label className="block">
          <span className="vz-label">Footer note</span>
          <textarea
            className="form-input min-h-24 resize-y"
            value={form.footer_note}
            onChange={(event) =>
              setForm({ ...form, footer_note: event.target.value })
            }
          />
        </label>
        <label className="flex items-center justify-between border border-[var(--card-border)] px-3 py-3 text-sm font-medium">
          Show tax breakdown on invoice
          <input
            type="checkbox"
            role="switch"
            className="form-switch"
            checked={form.show_tax_breakdown}
            onChange={(event) =>
              setForm({ ...form, show_tax_breakdown: event.target.checked })
            }
          />
        </label>
        <p className="text-xs text-[var(--muted)]">
          Preview number: {form.invoice_prefix}
          {form.next_number}
        </p>
        <div className="flex justify-end border-t border-[var(--card-border)] pt-4">
          <button type="submit" disabled={busy} className="primary-button">
            {busy ? "Saving..." : "Save invoice settings"}
          </button>
        </div>
      </form>
    </section>
  );
}
