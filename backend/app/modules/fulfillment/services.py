from __future__ import annotations

import random
import string
from datetime import datetime, timezone

from app.modules.fulfillment.models import Shipment, ShipmentEvent
from app.modules.fulfillment.repositories import (
    CourierAccountRepository,
    ShipmentRepository,
)
from app.modules.fulfillment.schemas import (
    PickupScheduleRequest,
    ShipmentCreateRequest,
    ShipmentEventCreate,
    ShipmentExceptionRequest,
    ShipmentResponse,
)
from app.modules.orders.repositories.order_repository import OrderRepository
from app.utils.exceptions import AppError, NotFoundError

CREATABLE_ORDER_STATUSES = {"pending", "paid"}
TERMINAL_STATUSES = {"delivered", "cancelled", "rto"}


def _demo_awb() -> str:
    suffix = "".join(random.choices(string.digits, k=10))
    return f"AWB-DEMO-{suffix}"


class ShipmentService:
    """VL-023/VL-024/VL-025 — shipment creation, pickup, and tracking events."""

    def __init__(
        self,
        repository: ShipmentRepository,
        courier_repository: CourierAccountRepository,
        order_repository: OrderRepository,
    ):
        self.repository = repository
        self.courier_repository = courier_repository
        self.order_repository = order_repository

    def list_shipments(self) -> list[ShipmentResponse]:
        return [self._to_response(row) for row in self.repository.list()]

    def create_shipment(self, payload: ShipmentCreateRequest) -> ShipmentResponse:
        order = self.order_repository.get(payload.order_id)
        if not order:
            raise NotFoundError("Order not found")
        if order.status not in CREATABLE_ORDER_STATUSES:
            raise AppError(
                f"Cannot create a shipment for an order in status '{order.status}'",
                400,
            )

        shipment = self.repository.create(
            order_id=order.id,
            courier_provider=payload.provider,
            awb=_demo_awb(),
            label_url=f"/uploads/labels/demo-{order.order_number}.pdf",
            status="created",
        )
        self.repository.add_event(
            ShipmentEvent(
                shipment_id=shipment.id,
                status="created",
                message="Shipment created",
                source="manual",
            )
        )
        return self._to_response(self.repository.get(shipment.id) or shipment)

    def schedule_pickup(
        self, shipment_id: int, payload: PickupScheduleRequest
    ) -> ShipmentResponse:
        shipment = self._get_or_404(shipment_id)
        shipment.pickup_scheduled_at = payload.pickup_at or datetime.now(timezone.utc)
        shipment.status = "pickup_scheduled"
        self.repository.save(shipment)
        self.repository.add_event(
            ShipmentEvent(
                shipment_id=shipment.id,
                status="pickup_scheduled",
                message="Pickup scheduled",
                source="manual",
            )
        )
        return self._to_response(self.repository.get(shipment.id) or shipment)

    def add_event(
        self, shipment_id: int, payload: ShipmentEventCreate
    ) -> ShipmentResponse:
        shipment = self._get_or_404(shipment_id)
        event = ShipmentEvent(
            shipment_id=shipment.id,
            status=payload.status,
            message=payload.message,
            source=payload.source,
        )
        if payload.event_at:
            event.event_at = payload.event_at
        self.repository.add_event(event)

        shipment.status = payload.status
        if payload.status.lower() not in TERMINAL_STATUSES:
            shipment.exception_flag = False
        self.repository.save(shipment)
        return self._to_response(self.repository.get(shipment.id) or shipment)

    def mark_exception(
        self, shipment_id: int, payload: ShipmentExceptionRequest
    ) -> ShipmentResponse:
        shipment = self._get_or_404(shipment_id)
        shipment.exception_flag = True
        shipment.exception_reason = payload.reason
        shipment.status = "exception"
        self.repository.save(shipment)
        self.repository.add_event(
            ShipmentEvent(
                shipment_id=shipment.id,
                status="exception",
                message=payload.reason,
                source="manual",
            )
        )
        return self._to_response(self.repository.get(shipment.id) or shipment)

    def get_timeline(self, shipment_id: int) -> ShipmentResponse:
        return self._to_response(self._get_or_404(shipment_id))

    def get_for_order(self, order_id: int) -> list[ShipmentResponse]:
        return [self._to_response(row) for row in self.repository.get_for_order(order_id)]

    def _get_or_404(self, shipment_id: int) -> Shipment:
        shipment = self.repository.get(shipment_id)
        if not shipment:
            raise NotFoundError("Shipment not found")
        return shipment

    def _to_response(self, shipment: Shipment) -> ShipmentResponse:
        return ShipmentResponse.model_validate(shipment)
