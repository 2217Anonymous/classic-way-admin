"use client";

import { useEffect } from "react";
import { AlertTriangle, CheckCircle2, X, XCircle } from "lucide-react";

import { dismissToast, type ToastTone } from "@/store/toastSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const toneStyles: Record<
  ToastTone,
  { wrap: string; icon: string; Icon: typeof CheckCircle2 }
> = {
  success: {
    wrap: "border-emerald-200 bg-emerald-50 text-emerald-950",
    icon: "text-emerald-600",
    Icon: CheckCircle2,
  },
  error: {
    wrap: "border-rose-200 bg-rose-50 text-rose-900",
    icon: "text-rose-600",
    Icon: XCircle,
  },
  warning: {
    wrap: "border-amber-200 bg-amber-50 text-amber-950",
    icon: "text-amber-600",
    Icon: AlertTriangle,
  },
};

function ToastItem({
  id,
  tone,
  title,
  message,
}: {
  id: string;
  tone: ToastTone;
  title: string;
  message?: string;
}) {
  const dispatch = useAppDispatch();
  const style = toneStyles[tone];
  const Icon = style.Icon;

  useEffect(() => {
    const timer = window.setTimeout(
      () => dispatch(dismissToast(id)),
      tone === "error" ? 6000 : 4000,
    );
    return () => window.clearTimeout(timer);
  }, [dispatch, id, tone]);

  return (
    <div
      className={`pointer-events-auto flex w-full max-w-md items-start gap-3 border px-4 py-3 backdrop-blur-xl ${style.wrap}`}
      role="status"
    >
      <Icon className={`mt-0.5 size-5 shrink-0 ${style.icon}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        {message && <p className="mt-0.5 text-sm opacity-80">{message}</p>}
      </div>
      <button
        type="button"
        onClick={() => dispatch(dismissToast(id))}
        className="p-1 opacity-60 transition hover:bg-black/5 hover:opacity-100"
        aria-label="Dismiss notification"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function Toaster() {
  const items = useAppSelector((state) => state.toast.items);
  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[80] flex flex-col items-end gap-3 px-4 sm:px-6">
      {items.map((toast) => (
        <ToastItem key={toast.id} {...toast} />
      ))}
    </div>
  );
}
