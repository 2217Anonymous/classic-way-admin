import { createAsyncThunk, createSlice, isAnyOf } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api";
import { normalizeShipment } from "@/lib/mappers";
import type {
  CreateShipmentInput,
  Order,
  Shipment,
  ShipmentEventInput,
  ShipmentStatus,
} from "@/lib/types";

type StateWithAuth = {
  auth: { token: string | null };
  orders: { items: Order[] };
};

type ShipmentsState = {
  items: Shipment[];
  loading: boolean;
  error: string | null;
};

const initialState: ShipmentsState = {
  items: [],
  loading: false,
  error: null,
};

function mapShipment(raw: unknown, orders: Order[]): Shipment {
  const base = normalizeShipment(raw as Record<string, unknown>);
  if (base.order_number && base.order_number !== "—") return base;
  const order = orders.find((row) => row.id === base.order_id);
  return {
    ...base,
    order_number: order?.order_number ?? base.order_number,
  };
}

export const fetchShipments = createAsyncThunk<
  Shipment[],
  void,
  { state: StateWithAuth }
>("shipments/fetch", async (_, { getState }) => {
  const state = getState();
  const rows = await apiRequest<unknown[]>("/shipments", {}, state.auth.token);
  return rows.map((row) => mapShipment(row, state.orders.items));
});

export const createShipment = createAsyncThunk<
  Shipment,
  CreateShipmentInput,
  { state: StateWithAuth }
>("shipments/create", async (payload, { getState }) => {
  const state = getState();
  const row = await apiRequest<unknown>(
    "/shipments",
    {
      method: "POST",
      body: JSON.stringify({
        order_id: payload.order_id,
        provider: payload.carrier || "manual",
      }),
    },
    state.auth.token,
  );
  return mapShipment(row, state.orders.items);
});

export const schedulePickup = createAsyncThunk<
  Shipment,
  { id: string; pickupAt: string },
  { state: StateWithAuth }
>("shipments/schedulePickup", async ({ id, pickupAt }, { getState }) => {
  const state = getState();
  const row = await apiRequest<unknown>(
    `/shipments/${id}/pickup`,
    { method: "POST", body: JSON.stringify({ pickup_at: pickupAt }) },
    state.auth.token,
  );
  return mapShipment(row, state.orders.items);
});

export const addShipmentEvent = createAsyncThunk<
  Shipment,
  { id: string; event: ShipmentEventInput },
  { state: StateWithAuth }
>("shipments/addEvent", async ({ id, event }, { getState }) => {
  const state = getState();
  const row = await apiRequest<unknown>(
    `/shipments/${id}/events`,
    {
      method: "POST",
      body: JSON.stringify({
        status: event.status,
        message: event.description,
        source: "manual",
      }),
    },
    state.auth.token,
  );
  return mapShipment(row, state.orders.items);
});

export const overrideShipmentException = createAsyncThunk<
  Shipment,
  { id: string; reason: string; resolutionStatus: ShipmentStatus },
  { state: StateWithAuth }
>("shipments/overrideException", async ({ id, reason, resolutionStatus }, { getState }) => {
  const state = getState();
  // Resolution event clears exception_flag when status is non-terminal.
  const row = await apiRequest<unknown>(
    `/shipments/${id}/events`,
    {
      method: "POST",
      body: JSON.stringify({
        status: resolutionStatus,
        message: reason,
        source: "manual",
      }),
    },
    state.auth.token,
  );
  return mapShipment(row, state.orders.items);
});

const shipmentsSlice = createSlice({
  name: "shipments",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchShipments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchShipments.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(createShipment.fulfilled, (state, action) => {
        const exists = state.items.some((item) => item.id === action.payload.id);
        if (!exists) state.items.unshift(action.payload);
      })
      .addMatcher(
        isAnyOf(
          schedulePickup.fulfilled,
          addShipmentEvent.fulfilled,
          overrideShipmentException.fulfilled,
        ),
        (state, action) => {
          const index = state.items.findIndex((item) => item.id === action.payload.id);
          if (index >= 0) state.items[index] = action.payload;
        },
      )
      .addMatcher(
        isAnyOf(
          fetchShipments.rejected,
          createShipment.rejected,
          schedulePickup.rejected,
          addShipmentEvent.rejected,
          overrideShipmentException.rejected,
        ),
        (state, action) => {
          state.loading = false;
          state.error = action.error?.message ?? "Shipment request failed";
        },
      );
  },
});

export default shipmentsSlice.reducer;
