import { createAsyncThunk, createSlice, isAnyOf } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api";
import { normalizeNotification } from "@/lib/mappers";
import type { NotificationItem, SendTestNotificationInput } from "@/lib/types";

type StateWithAuth = { auth: { token: string | null } };

type NotificationsState = {
  items: NotificationItem[];
  loading: boolean;
  error: string | null;
};

const initialState: NotificationsState = {
  items: [],
  loading: false,
  error: null,
};

function mapNotification(raw: unknown): NotificationItem {
  return normalizeNotification(raw as Record<string, unknown>);
}

export const fetchNotifications = createAsyncThunk<
  NotificationItem[],
  void,
  { state: StateWithAuth }
>("notifications/fetch", async (_, { getState }) => {
  const rows = await apiRequest<unknown[]>(
    "/notifications",
    {},
    getState().auth.token,
  );
  return rows.map(mapNotification);
});

export const sendTestNotification = createAsyncThunk<
  NotificationItem,
  SendTestNotificationInput,
  { state: StateWithAuth }
>("notifications/sendTest", async (payload, { getState }) => {
  const channel = payload.channel === "sms" ? "sms" : "email";
  const row = await apiRequest<unknown>(
    "/notifications/send",
    {
      method: "POST",
      body: JSON.stringify({
        channel,
        template_key: payload.event || "admin_test",
        recipient: payload.recipient,
        context: {
          subject: payload.subject,
          message: payload.message,
        },
      }),
    },
    getState().auth.token,
  );
  return mapNotification(row);
});

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(sendTestNotification.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addMatcher(
        isAnyOf(fetchNotifications.rejected, sendTestNotification.rejected),
        (state, action) => {
          state.loading = false;
          state.error = action.error?.message ?? "Notification request failed";
        },
      );
  },
});

export default notificationsSlice.reducer;
