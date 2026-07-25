import { createAsyncThunk, createSlice, isAnyOf } from "@reduxjs/toolkit";

import { apiRequest } from "@/lib/api";
import type {
  CreateShipmentInput,
  Shipment,
  ShipmentEventInput,
  ShipmentStatus,
} from "@/lib/types";

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

export const fetchShipments = createAsyncThunk<
  Shipment[],
  void,
  { state: StateWithAuth }
>("shipments/fetch", async (_, { getState }) => {
  return apiRequest<Shipment[]>("/shipments", {}, getState().auth.token);
});

export const createShipment = createAsyncThunk<
  Shipment,
  CreateShipmentInput,
  { state: StateWithAuth }
>("shipments/create", async (payload, { getState }) => {
  return apiRequest<Shipment>(
    "/shipments",
    { method: "POST", body: JSON.stringify(payload) },
    getState().auth.token,
  );
});

export const schedulePickup = createAsyncThunk<
  Shipment,
  { id: string; pickupAt: string },
  { state: StateWithAuth }
>("shipments/schedulePickup", async ({ id, pickupAt }, { getState }) => {
  return apiRequest<Shipment>(
    `/shipments/${id}/schedule-pickup`,
    { method: "POST", body: JSON.stringify({ pickup_at: pickupAt }) },
    getState().auth.token,
  );
});

export const addShipmentEvent = createAsyncThunk<
  Shipment,
  { id: string; event: ShipmentEventInput },
  { state: StateWithAuth }
>("shipments/addEvent", async ({ id, event }, { getState }) => {
  return apiRequest<Shipment>(
    `/shipments/${id}/events`,
    { method: "POST", body: JSON.stringify(event) },
    getState().auth.token,
  );
});

export const overrideShipmentException = createAsyncThunk<
  Shipment,
  { id: string; reason: string; resolutionStatus: ShipmentStatus },
  { state: StateWithAuth }
>("shipments/overrideException", async ({ id, reason, resolutionStatus }, { getState }) => {
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
