import type { AppDispatch } from "@/store";
import { pushToast } from "@/store/toastSlice";

export function toastSuccess(
  dispatch: AppDispatch,
  title: string,
  message?: string,
) {
  dispatch(pushToast({ tone: "success", title, message }));
}

export function toastError(
  dispatch: AppDispatch,
  title: string,
  message?: string,
) {
  dispatch(pushToast({ tone: "error", title, message }));
}

export function toastWarning(
  dispatch: AppDispatch,
  title: string,
  message?: string,
) {
  dispatch(pushToast({ tone: "warning", title, message }));
}

export function toastFromError(
  dispatch: AppDispatch,
  error: unknown,
  fallback = "Something went wrong",
) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : fallback;
  toastError(dispatch, fallback, message);
}
