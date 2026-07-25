import { createSlice, nanoid, type PayloadAction } from "@reduxjs/toolkit";

export type ToastTone = "success" | "error" | "warning";

export type Toast = {
  id: string;
  tone: ToastTone;
  title: string;
  message?: string;
};

type ToastState = {
  items: Toast[];
};

const initialState: ToastState = {
  items: [],
};

type PushToastPayload = {
  tone: ToastTone;
  title: string;
  message?: string;
};

const toastSlice = createSlice({
  name: "toast",
  initialState,
  reducers: {
    pushToast: {
      reducer(state, action: PayloadAction<Toast>) {
        state.items.push(action.payload);
        if (state.items.length > 5) {
          state.items.shift();
        }
      },
      prepare({ tone, title, message }: PushToastPayload) {
        return {
          payload: {
            id: nanoid(),
            tone,
            title,
            message,
          },
        };
      },
    },
    dismissToast(state, action: PayloadAction<string>) {
      state.items = state.items.filter((toast) => toast.id !== action.payload);
    },
    clearToasts(state) {
      state.items = [];
    },
  },
});

export const { pushToast, dismissToast, clearToasts } = toastSlice.actions;
export default toastSlice.reducer;
