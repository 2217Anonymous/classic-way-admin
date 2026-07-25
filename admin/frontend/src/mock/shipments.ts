import type { Shipment, ShipmentEvent, ShipmentStatus } from "@/lib/types";

import { mockOrders } from "./orders";

function eventsFor(
  shipmentId: number,
  baseTime: number,
  entries: { offsetHours: number; status: string; description: string; location: string | null }[],
): ShipmentEvent[] {
  return entries.map((entry, index) => ({
    id: shipmentId * 100 + index,
    shipment_id: shipmentId,
    status: entry.status,
    description: entry.description,
    location: entry.location,
    occurred_at: new Date(baseTime + entry.offsetHours * 60 * 60 * 1000).toISOString(),
  }));
}

type Blueprint = {
  orderIndex: number;
  carrier: string;
  status: ShipmentStatus;
  exceptionFlag: boolean;
  exceptionReason: string | null;
};

const blueprints: Blueprint[] = [
  { orderIndex: 0, carrier: "Delhivery", status: "delivered", exceptionFlag: false, exceptionReason: null },
  { orderIndex: 1, carrier: "Blue Dart", status: "exception", exceptionFlag: true, exceptionReason: "Address not found, awaiting customer confirmation" },
  { orderIndex: 2, carrier: "DTDC", status: "scheduled", exceptionFlag: false, exceptionReason: null },
  { orderIndex: 3, carrier: "Delhivery", status: "pending", exceptionFlag: false, exceptionReason: null },
];

function buildShipment(bp: Blueprint, index: number): Shipment {
  const order = mockOrders[bp.orderIndex];
  const shipmentId = index + 1;
  const baseTime = new Date(order.placed_at).getTime();
  const trackingNumber = `TRK${order.order_number.replace("CW-", "")}${shipmentId}`;

  let events: ShipmentEvent[] = [];
  if (bp.status === "delivered") {
    events = eventsFor(shipmentId, baseTime, [
      { offsetHours: 4, status: "picked_up", description: "Package picked up from warehouse", location: "Coimbatore Hub" },
      { offsetHours: 30, status: "in_transit", description: "In transit to destination city", location: "Chennai Hub" },
      { offsetHours: 60, status: "out_for_delivery", description: "Out for delivery", location: "Chennai" },
      { offsetHours: 66, status: "delivered", description: "Delivered to customer", location: "Chennai" },
    ]);
  } else if (bp.status === "exception") {
    events = eventsFor(shipmentId, baseTime, [
      { offsetHours: 4, status: "picked_up", description: "Package picked up from warehouse", location: "Coimbatore Hub" },
      { offsetHours: 28, status: "in_transit", description: "In transit to destination city", location: "Chennai Hub" },
      { offsetHours: 40, status: "exception", description: "Delivery attempt failed - address not found", location: "Chennai" },
    ]);
  } else if (bp.status === "scheduled") {
    events = eventsFor(shipmentId, baseTime, [
      { offsetHours: 2, status: "scheduled", description: "Pickup scheduled with carrier", location: "Coimbatore Hub" },
    ]);
  } else {
    events = eventsFor(shipmentId, baseTime, [
      { offsetHours: 1, status: "pending", description: "Shipment created, awaiting pickup schedule", location: null },
    ]);
  }

  return {
    id: shipmentId,
    order_id: order.id,
    order_number: order.order_number,
    carrier: bp.carrier,
    tracking_number: trackingNumber,
    status: bp.status,
    exception_flag: bp.exceptionFlag,
    exception_reason: bp.exceptionReason,
    pickup_scheduled_at:
      bp.status === "pending"
        ? null
        : new Date(baseTime + 2 * 60 * 60 * 1000).toISOString(),
    estimated_delivery: new Date(baseTime + 96 * 60 * 60 * 1000).toISOString(),
    events,
    created_at: order.placed_at,
    updated_at: events[events.length - 1]?.occurred_at ?? order.placed_at,
  };
}

export const mockShipments: Shipment[] = blueprints.map(buildShipment);
