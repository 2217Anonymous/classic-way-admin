"use client";

import { FormEvent, useEffect, useState } from "react";

import { toastError, toastSuccess } from "@/lib/toast";
import type { StoreSettingsInput } from "@/lib/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchStoreSettings,
  updateStoreSettings,
} from "@/store/storeSettingsSlice";

const emptyForm: StoreSettingsInput = {
  store_name: "",
  legal_name: "",
  email: "",
  phone: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  postal_code: "",
  country: "",
  currency: "INR",
  timezone: "Asia/Kolkata",
};

export function ShopDetailsPanel() {
  const dispatch = useAppDispatch();
  const { item, loading, saving, error } = useAppSelector(
    (state) => state.storeSettings,
  );
  const [form, setForm] = useState<StoreSettingsInput>(emptyForm);

  useEffect(() => {
    void dispatch(fetchStoreSettings());
  }, [dispatch]);

  useEffect(() => {
    if (error) toastError(dispatch, "Request failed", error);
  }, [error, dispatch]);

  useEffect(() => {
    if (!item) return;
    setForm({
      store_name: item.store_name,
      legal_name: item.legal_name ?? "",
      email: item.email ?? "",
      phone: item.phone ?? "",
      address_line1: item.address_line1 ?? "",
      address_line2: item.address_line2 ?? "",
      city: item.city ?? "",
      state: item.state ?? "",
      postal_code: item.postal_code ?? "",
      country: item.country ?? "",
      currency: item.currency,
      timezone: item.timezone,
    });
  }, [item]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const payload: StoreSettingsInput = {
      store_name: form.store_name.trim(),
      legal_name: form.legal_name?.trim() || null,
      email: form.email?.trim() || null,
      phone: form.phone?.trim() || null,
      address_line1: form.address_line1?.trim() || null,
      address_line2: form.address_line2?.trim() || null,
      city: form.city?.trim() || null,
      state: form.state?.trim() || null,
      postal_code: form.postal_code?.trim() || null,
      country: form.country?.trim() || null,
      currency: form.currency?.trim() || "INR",
      timezone: form.timezone?.trim() || "Asia/Kolkata",
    };
    const result = await dispatch(updateStoreSettings(payload));
    if (updateStoreSettings.fulfilled.match(result)) {
      toastSuccess(dispatch, "Shop details saved", "Store profile was updated.");
    } else {
      toastError(
        dispatch,
        "Could not save shop details",
        result.error?.message ?? "Please try again.",
      );
    }
  }

  return (
    <section className="vz-card max-w-3xl">
      <div className="vz-card-header">
        <h2 className="vz-card-title">Our shop details</h2>
      </div>
      <form onSubmit={submit} className="vz-card-body space-y-4">
        {loading && !item ? (
          <p className="text-sm text-[var(--muted)]">Loading shop details…</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="vz-label">Store name</span>
                <input
                  className="form-input"
                  required
                  value={form.store_name}
                  onChange={(event) =>
                    setForm({ ...form, store_name: event.target.value })
                  }
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="vz-label">Legal name</span>
                <input
                  className="form-input"
                  value={form.legal_name ?? ""}
                  onChange={(event) =>
                    setForm({ ...form, legal_name: event.target.value })
                  }
                />
              </label>
              <label className="block">
                <span className="vz-label">Email</span>
                <input
                  className="form-input"
                  type="email"
                  value={form.email ?? ""}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                />
              </label>
              <label className="block">
                <span className="vz-label">Phone</span>
                <input
                  className="form-input"
                  value={form.phone ?? ""}
                  onChange={(event) =>
                    setForm({ ...form, phone: event.target.value })
                  }
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="vz-label">Address line 1</span>
                <input
                  className="form-input"
                  value={form.address_line1 ?? ""}
                  onChange={(event) =>
                    setForm({ ...form, address_line1: event.target.value })
                  }
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="vz-label">Address line 2</span>
                <input
                  className="form-input"
                  value={form.address_line2 ?? ""}
                  onChange={(event) =>
                    setForm({ ...form, address_line2: event.target.value })
                  }
                />
              </label>
              <label className="block">
                <span className="vz-label">City</span>
                <input
                  className="form-input"
                  value={form.city ?? ""}
                  onChange={(event) =>
                    setForm({ ...form, city: event.target.value })
                  }
                />
              </label>
              <label className="block">
                <span className="vz-label">State</span>
                <input
                  className="form-input"
                  value={form.state ?? ""}
                  onChange={(event) =>
                    setForm({ ...form, state: event.target.value })
                  }
                />
              </label>
              <label className="block">
                <span className="vz-label">Postal code</span>
                <input
                  className="form-input"
                  value={form.postal_code ?? ""}
                  onChange={(event) =>
                    setForm({ ...form, postal_code: event.target.value })
                  }
                />
              </label>
              <label className="block">
                <span className="vz-label">Country</span>
                <input
                  className="form-input"
                  value={form.country ?? ""}
                  onChange={(event) =>
                    setForm({ ...form, country: event.target.value })
                  }
                />
              </label>
              <label className="block">
                <span className="vz-label">Currency</span>
                <input
                  className="form-input"
                  required
                  value={form.currency ?? "INR"}
                  onChange={(event) =>
                    setForm({ ...form, currency: event.target.value })
                  }
                />
              </label>
              <label className="block">
                <span className="vz-label">Timezone</span>
                <input
                  className="form-input"
                  required
                  value={form.timezone ?? "Asia/Kolkata"}
                  onChange={(event) =>
                    setForm({ ...form, timezone: event.target.value })
                  }
                />
              </label>
            </div>
            <div className="flex justify-end border-t border-[var(--card-border)] pt-4">
              <button type="submit" disabled={saving} className="primary-button">
                {saving ? "Saving..." : "Save shop details"}
              </button>
            </div>
          </>
        )}
      </form>
    </section>
  );
}
