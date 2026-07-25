from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.modules.catalog.repositories.product_repository import ProductRepository
from app.modules.iam.api.dependencies import AdminUser, require_roles
from app.modules.iam.constants import MANAGER_ROLE, VIEWER_ROLE
from app.modules.identity.api.dependencies import DbSession
from app.modules.identity.models.user import User
from app.modules.inventory.repositories import InventoryItemRepository
from app.modules.orders.repositories.address_repository import AddressRepository
from app.modules.orders.repositories.cart_repository import CartRepository
from app.modules.orders.repositories.order_repository import OrderRepository
from app.modules.orders.schemas.order import (
    CheckoutRequest,
    OrderCancelRequest,
    OrderResponse,
)
from app.modules.orders.services.order_service import OrderService
from app.modules.settings.repositories import CouponRepository

router = APIRouter(prefix="/orders", tags=["Orders"])


def get_service(db: DbSession) -> OrderService:
    return OrderService(
        OrderRepository(db),
        CartRepository(db),
        AddressRepository(db),
        InventoryItemRepository(db),
        CouponRepository(db),
        ProductRepository(db),
    )


@router.post("/checkout", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def checkout(payload: CheckoutRequest, db: DbSession) -> OrderResponse:
    return get_service(db).checkout(payload)


@router.get("", response_model=list[OrderResponse])
def list_orders(
    db: DbSession,
    _: Annotated[User, Depends(require_roles(MANAGER_ROLE, VIEWER_ROLE))],
    status_filter: Annotated[str | None, Query(alias="status")] = None,
) -> list[OrderResponse]:
    return get_service(db).list_orders(status_filter)


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int,
    db: DbSession,
    _: Annotated[User, Depends(require_roles(MANAGER_ROLE, VIEWER_ROLE))],
) -> OrderResponse:
    return get_service(db).get_order(order_id)


@router.post("/{order_id}/cancel", response_model=OrderResponse)
def cancel_order(
    order_id: int, payload: OrderCancelRequest, db: DbSession, _: AdminUser
) -> OrderResponse:
    return get_service(db).cancel_order(order_id, payload.reason)


@router.post("/{order_id}/mark-paid", response_model=OrderResponse)
def mark_order_paid(order_id: int, db: DbSession, _: AdminUser) -> OrderResponse:
    return get_service(db).mark_paid(order_id)
