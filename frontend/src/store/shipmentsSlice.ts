import { createAsyncThunk, createSlice, isAnyOf } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api";
import type {
  CreateShipmentInput,
  Shipment,
  ShipmentEvent,
  ShipmentEventInput,
  ShipmentStatus,
} from "@/lib/types";
import { isDemoMockForced, mockShipments, resolveDemoData } from "@/mock";

type StateWithAuth = { auth: { token: string | null } };

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

let mockItems: Shipment[] = mockShipments.map((item) => ({
  ...item,
  events: item.events.map((event) => ({ ...event })),
}));
let nextMockId = Math.max(0, ...mockItems.map((item) => item.id)) + 1;
let nextEventId =
  Math.max(0, ...mockItems.flatMap((item) => item.events.map((event) => event.id))) + 1;

export const fetchShipments = createAsyncThunk<
  Shipment[],
  void,
  { state: StateWithAuth }
>("shipments/fetch", async (_, { getState }) => {
  if (isDemoMockForced()) {
    return mockItems.map((item) => ({ ...item, events: [...item.events] }));
  }
  try {
    const data = await apiRequest<Shipment[]>("/shipments", {}, getState().auth.token);
    return resolveDemoData(data, mockShipments);
  } catch {
    return resolveDemoData([], mockShipments);
  }
});

export const createShipment = createAsyncThunk<
  Shipment,
  CreateShipmentInput,
  { state: StateWithAuth }
>("shipments/create", async (payload, { getState }) => {
  if (isDemoMockForced()) {
    const now = new Date().toISOString();
    const id = nextMockId++;
    const orderRelated = mockItems.find((item) => item.order_id === payload.order_id);
    const shipment: Shipment = {
      id,
      order_id: payload.order_id,
      order_number: orderRelated?.order_number ?? `CW-${1000 + payload.order_id}`,
      carrier: payload.carrier,
      tracking_number: payload.tracking_number || `TRK${payload.order_id}${id}`,
      status: "pending",
      exception_flag: false,
      exception_reason: null,
      pickup_scheduled_at: null,
      estimated_delivery: payload.estimated_delivery ?? null,
      events: [
        {
          id: nextEventId++,
          shipment_id: id,
          status: "pending",
          description: "Shipment created, awaiting pickup schedule",
          location: null,
          occurred_at: now,
        },
      ],
      created_at: now,
      updated_at: now,
    };
    mockItems = [shipment, ...mockItems];
    return shipment;
  }
  return apiRequest<Shipment>(
    "/shipments",
    { method: "POST", body: JSON.stringify(payload) },
    getState().auth.token,
  );
});

export const schedulePickup = createAsyncThunk<
  Shipment,
  { id: number; pickupAt: string },
  { state: StateWithAuth }
>("shipments/schedulePickup", async ({ id, pickupAt }, { getState }) => {
  if (isDemoMockForced()) {
    const index = mockItems.findIndex((item) => item.id === id);
    if (index < 0) throw new Error("Shipment not found");
    const now = new Date().toISOString();
    const event: ShipmentEvent = {
      id: nextEventId++,
      shipment_id: id,
      status: "scheduled",
      description: `Pickup scheduled for ${new Date(pickupAt).toLocaleString()}`,
      location: null,
      occurred_at: now,
    };
    const updated: Shipment = {
      ...mockItems[index],
      status: "scheduled",
      pickup_scheduled_at: pickupAt,
      events: [...mockItems[index].events, event],
      updated_at: now,
    };
    mockItems = mockItems.map((item) => (item.id === id ? updated : item));
    return updated;
  }
  return apiRequest<Shipment>(
    `/shipments/${id}/schedule-pickup`,
    { method: "POST", body: JSON.stringify({ pickup_at: pickupAt }) },
    getState().auth.token,
  );
});

export const addShipmentEvent = createAsyncThunk<
  Shipment,
  { id: number; event: ShipmentEventInput },
  { state: StateWithAuth }
>("shipments/addEvent", async ({ id, event }, { getState }) => {
  if (isDemoMockForced()) {
    const index = mockItems.findIndex((item) => item.id === id);
    if (index < 0) throw new Error("Shipment not found");
    const now = new Date().toISOString();
    const newEvent: ShipmentEvent = {
      id: nextEventId++,
      shipment_id: id,
      status: event.status,
      description: event.description,
      location: event.location ?? null,
      occurred_at: now,
    };
    const isException = event.status === "exception";
    const updated: Shipment = {
      ...mockItems[index],
      status: (event.status as ShipmentStatus) || mockItems[index].status,
      exception_flag: isException ? true : mockItems[index].exception_flag,
      exception_reason: isException ? event.description : mockItems[index].exception_reason,
      events: [...mockItems[index].events, newEvent],
      updated_at: now,
    };
    mockItems = mockItems.map((item) => (item.id === id ? updated : item));
    return updated;
  }
  return apiRequest<Shipment>(
    `/shipments/${id}/events`,
    { method: "POST", body: JSON.stringify(event) },
    getState().auth.token,
  );
});

export const overrideShipmentException = createAsyncThunk<
  Shipment,
  { id: number; reason: string; resolutionStatus: ShipmentStatus },
  { state: StateWithAuth }
>("shipments/overrideException", async ({ id, reason, resolutionStatus }, { getState }) => {
  if (isDemoMockForced()) {
    const index = mockItems.findIndex((item) => item.id === id);
    if (index < 0) throw new Error("Shipment not found");
    if (!reason.trim()) throw new Error("Override reason is required");
    const now = new Date().toISOString();
    const event: ShipmentEvent = {
      id: nextEventId++,
      shipment_id: id,
      status: resolutionStatus,
      description: `Exception overridden by admin: ${reason}`,
      location: null,
      occurred_at: now,
    };
    const updated: Shipment = {
      ...mockItems[index],
      status: resolutionStatus,
      exception_flag: false,
      exception_reason: null,
      events: [...mockItems[index].events, event],
      updated_at: now,
    };
    mockItems = mockItems.map((item) => (item.id === id ? updated : item));
    return updated;
  }
  return apiRequest<Shipment>(
    `/shipments/${id}/override-exception`,
    { method: "POST", body: JSON.stringify({ reason, resolution_status: resolutionStatus }) },
    getState().auth.token,
  );
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
