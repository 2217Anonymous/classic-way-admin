from typing import Annotated

from fastapi import APIRouter, Depends, status

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
    TrackingResponse,
)
from app.modules.fulfillment.services import ShipmentService
from app.modules.iam.api.dependencies import AdminUser, require_roles
from app.modules.iam.constants import MANAGER_ROLE, VIEWER_ROLE
from app.modules.identity.api.dependencies import DbSession
from app.modules.identity.models.user import User
from app.modules.orders.repositories.order_repository import OrderRepository
from app.utils.exceptions import NotFoundError

router = APIRouter(prefix="/shipments", tags=["Fulfillment"])
track_router = APIRouter(prefix="/track", tags=["Tracking"])


def get_service(db: DbSession) -> ShipmentService:
    return ShipmentService(
        ShipmentRepository(db),
        CourierAccountRepository(db),
        OrderRepository(db),
    )


@router.get("", response_model=list[ShipmentResponse])
def list_shipments(
    db: DbSession,
    _: Annotated[User, Depends(require_roles(MANAGER_ROLE, VIEWER_ROLE))],
) -> list[ShipmentResponse]:
    return get_service(db).list_shipments()


@router.post("", response_model=ShipmentResponse, status_code=status.HTTP_201_CREATED)
def create_shipment(
    payload: ShipmentCreateRequest, db: DbSession, _: AdminUser
) -> ShipmentResponse:
    return get_service(db).create_shipment(payload)


@router.post("/{shipment_id}/pickup", response_model=ShipmentResponse)
def schedule_pickup(
    shipment_id: int,
    db: DbSession,
    _: AdminUser,
    payload: PickupScheduleRequest | None = None,
) -> ShipmentResponse:
    return get_service(db).schedule_pickup(shipment_id, payload or PickupScheduleRequest())


@router.post("/{shipment_id}/events", response_model=ShipmentResponse)
def add_shipment_event(
    shipment_id: int, payload: ShipmentEventCreate, db: DbSession, _: AdminUser
) -> ShipmentResponse:
    return get_service(db).add_event(shipment_id, payload)


@router.post("/{shipment_id}/exception", response_model=ShipmentResponse)
def mark_shipment_exception(
    shipment_id: int, payload: ShipmentExceptionRequest, db: DbSession, _: AdminUser
) -> ShipmentResponse:
    return get_service(db).mark_exception(shipment_id, payload)


@router.get("/{shipment_id}/timeline", response_model=ShipmentResponse)
def get_shipment_timeline(
    shipment_id: int,
    db: DbSession,
    _: Annotated[User, Depends(require_roles(MANAGER_ROLE, VIEWER_ROLE))],
) -> ShipmentResponse:
    return get_service(db).get_timeline(shipment_id)


@track_router.get("/{order_number}", response_model=TrackingResponse)
def track_order(order_number: str, db: DbSession) -> TrackingResponse:
    # Public, unauthenticated demo tracking page lookup by order number.
    order = OrderRepository(db).get_by_number(order_number)
    if not order:
        raise NotFoundError("Order not found")

    shipments = get_service(db).get_for_order(order.id)
    return TrackingResponse(
        order_number=order.order_number,
        status=order.status,
        total=order.total,
        currency=order.currency,
        created_at=order.created_at,
        shipments=shipments,
    )
