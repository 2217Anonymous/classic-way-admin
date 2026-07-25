import { createAsyncThunk, createSlice, isAnyOf } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api";
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

export const fetchNotifications = createAsyncThunk<
  NotificationItem[],
  void,
  { state: StateWithAuth }
>("notifications/fetch", async (_, { getState }) => {
  return apiRequest<NotificationItem[]>(
    "/notifications",
    {},
    getState().auth.token,
  );
});

export const sendTestNotification = createAsyncThunk<
  NotificationItem,
  SendTestNotificationInput,
  { state: StateWithAuth }
>("notifications/sendTest", async (payload, { getState }) => {
  return apiRequest<NotificationItem>(
    "/notifications/test",
    { method: "POST", body: JSON.stringify(payload) },
    getState().auth.token,
  );
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
