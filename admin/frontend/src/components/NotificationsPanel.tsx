"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Send } from "lucide-react";

import {
  FilterSelect,
  SortableTh,
  StaticTh,
  TablePagination,
  TableToolbar,
} from "@/components/DataTableControls";
import { Modal } from "@/components/Modal";
import { StatusPill } from "@/components/StatusPill";
import { useTableState } from "@/hooks/useTableState";
import { toastError, toastSuccess } from "@/lib/toast";
import type { NotificationChannel, NotificationItem } from "@/lib/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchNotifications, sendTestNotification } from "@/store/notificationsSlice";

type SortKey = "event" | "channel" | "recipient" | "status" | "sent";

const CHANNEL_LABEL: Record<NotificationChannel, string> = {
  email: "Email",
  sms: "SMS",
  push: "Push",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotificationsPanel() {
  const dispatch = useAppDispatch();
  const { items, loading, error } = useAppSelector((state) => state.notifications);
  const [channelFilter, setChannelFilter] = useState("all");
  const [sendOpen, setSendOpen] = useState(false);

  useEffect(() => {
    void dispatch(fetchNotifications());
  }, [dispatch]);

  useEffect(() => {
    if (error) toastError(dispatch, "Request failed", error);
  }, [error, dispatch]);

  const filtered = useMemo(() => {
    if (channelFilter === "all") return items;
    return items.filter((row) => row.channel === channelFilter);
  }, [items, channelFilter]);

  const matchesSearch = useCallback((row: NotificationItem, query: string) => {
    return [row.event, row.recipient, row.subject]
      .join(" ")
      .toLowerCase()
      .includes(query);
  }, []);

  const getSortValue = useCallback((row: NotificationItem, key: SortKey) => {
    switch (key) {
      case "event":
        return row.event;
      case "channel":
        return row.channel;
      case "recipient":
        return row.recipient;
      case "status":
        return row.status;
      case "sent":
        return row.sent_at ?? row.created_at;
      default:
        return row.event;
    }
  }, []);

  const table = useTableState<NotificationItem, SortKey>({
    rows: filtered,
    initialSort: { key: "sent", direction: "desc" },
    getSortValue,
    matchesSearch,
  });

  return (
    <>
      <section className="table-card">
        <div className="flex w-full items-center justify-between gap-3 border-b border-[var(--card-border)] px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Notifications</h2>
            <p className="text-xs text-[var(--muted)]">
              Order and shipment alerts sent to customers.
            </p>
          </div>
          <button type="button" onClick={() => setSendOpen(true)} className="primary-button">
            <Send size={15} /> Send test notification
          </button>
        </div>

        <TableToolbar
          search={table.search}
          onSearchChange={table.setSearch}
          searchPlaceholder="Search event, recipient or subject..."
          filters={
            <>
              <FilterSelect value={channelFilter} onChange={setChannelFilter} aria-label="Filter by channel">
                <option value="all">All channels</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="push">Push</option>
              </FilterSelect>
              <FilterSelect
                aria-label="Rows per page"
                value={String(table.pageSize)}
                onChange={(value) => table.setPageSize(Number(value))}
              >
                {table.pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size} / page
                  </option>
                ))}
              </FilterSelect>
            </>
          }
        />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="table-head">
              <tr>
                <SortableTh label="Event" sortKey="event" activeKey={table.sort.key} direction={table.sort.direction} onSort={table.toggleSort} />
                <SortableTh label="Channel" sortKey="channel" activeKey={table.sort.key} direction={table.sort.direction} onSort={table.toggleSort} />
                <SortableTh label="Recipient" sortKey="recipient" activeKey={table.sort.key} direction={table.sort.direction} onSort={table.toggleSort} />
                <StaticTh label="Subject" />
                <SortableTh label="Status" sortKey="status" activeKey={table.sort.key} direction={table.sort.direction} onSort={table.toggleSort} />
                <SortableTh label="Sent" sortKey="sent" activeKey={table.sort.key} direction={table.sort.direction} onSort={table.toggleSort} />
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                    Loading notifications…
                  </td>
                </tr>
              ) : table.pageRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                    No notifications found.
                  </td>
                </tr>
              ) : (
                table.pageRows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3.5 font-medium">{row.event}</td>
                    <td className="px-4 py-3.5">{CHANNEL_LABEL[row.channel]}</td>
                    <td className="px-4 py-3.5 text-slate-600">{row.recipient}</td>
                    <td className="px-4 py-3.5 text-slate-600">{row.subject}</td>
                    <td className="px-4 py-3.5">
                      <StatusPill
                        tone={
                          row.status === "sent"
                            ? "success"
                            : row.status === "failed"
                              ? "danger"
                              : "neutral"
                        }
                        label={row.status}
                        className="capitalize"
                      />
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{formatDate(row.sent_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={table.page}
          pageCount={table.pageCount}
          onPageChange={table.setPage}
          filteredCount={table.filteredCount}
          pageSize={table.pageSize}
        />
      </section>

      <SendTestModal open={sendOpen} onClose={() => setSendOpen(false)} />
    </>
  );
}

function SendTestModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    channel: "email" as NotificationChannel,
    event: "order.placed",
    recipient: "",
    subject: "Test notification from Classic Way",
    message: "This is a test notification triggered from the admin panel.",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      channel: "email",
      event: "order.placed",
      recipient: "",
      subject: "Test notification from Classic Way",
      message: "This is a test notification triggered from the admin panel.",
    });
  }, [open]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const result = await dispatch(sendTestNotification(form));
    setBusy(false);
    if (sendTestNotification.fulfilled.match(result)) {
      toastSuccess(dispatch, "Test notification sent", `Sent to ${form.recipient}.`);
      onClose();
    } else {
      toastError(dispatch, "Could not send notification", "Please try again.");
    }
  }

  return (
    <Modal open={open} title="Send test notification" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="vz-label">Channel</span>
            <select
              className="form-input"
              value={form.channel}
              onChange={(event) =>
                setForm({ ...form, channel: event.target.value as NotificationChannel })
              }
            >
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="push">Push</option>
            </select>
          </label>
          <label className="block">
            <span className="vz-label">Event</span>
            <input
              className="form-input"
              required
              value={form.event}
              onChange={(event) => setForm({ ...form, event: event.target.value })}
            />
          </label>
        </div>
        <label className="block">
          <span className="vz-label">
            {form.channel === "email" ? "Recipient email" : form.channel === "sms" ? "Recipient phone" : "Recipient device/user"}
          </span>
          <input
            className="form-input"
            required
            value={form.recipient}
            onChange={(event) => setForm({ ...form, recipient: event.target.value })}
            placeholder={form.channel === "email" ? "customer@example.com" : "+91 90000 00000"}
          />
        </label>
        <label className="block">
          <span className="vz-label">Subject</span>
          <input
            className="form-input"
            required
            value={form.subject}
            onChange={(event) => setForm({ ...form, subject: event.target.value })}
          />
        </label>
        <label className="block">
          <span className="vz-label">Message</span>
          <textarea
            className="form-input min-h-24 resize-y"
            required
            value={form.message}
            onChange={(event) => setForm({ ...form, message: event.target.value })}
          />
        </label>
        <div className="flex justify-end gap-2 border-t border-[var(--card-border)] pt-4">
          <button type="button" onClick={onClose} className="glass-secondary-button">
            Cancel
          </button>
          <button type="submit" disabled={busy} className="primary-button">
            {busy ? "Sending..." : "Send test"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
