import { createAsyncThunk, createSlice, isAnyOf } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api";
import type { NotificationItem, SendTestNotificationInput } from "@/lib/types";
import { isDemoMockForced, mockNotifications, resolveDemoData } from "@/mock";

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

let mockItems: NotificationItem[] = mockNotifications.map((item) => ({ ...item }));
let nextMockId = Math.max(0, ...mockItems.map((item) => item.id)) + 1;

export const fetchNotifications = createAsyncThunk<
  NotificationItem[],
  void,
  { state: StateWithAuth }
>("notifications/fetch", async (_, { getState }) => {
  if (isDemoMockForced()) return mockItems.map((item) => ({ ...item }));
  try {
    const data = await apiRequest<NotificationItem[]>(
      "/notifications",
      {},
      getState().auth.token,
    );
    return resolveDemoData(data, mockNotifications);
  } catch {
    return resolveDemoData([], mockNotifications);
  }
});

export const sendTestNotification = createAsyncThunk<
  NotificationItem,
  SendTestNotificationInput,
  { state: StateWithAuth }
>("notifications/sendTest", async (payload, { getState }) => {
  if (isDemoMockForced()) {
    const now = new Date().toISOString();
    const row: NotificationItem = {
      id: nextMockId++,
      channel: payload.channel,
      event: payload.event,
      recipient: payload.recipient,
      subject: payload.subject,
      message: payload.message,
      status: "sent",
      sent_at: now,
      created_at: now,
    };
    mockItems = [row, ...mockItems];
    return row;
  }
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
