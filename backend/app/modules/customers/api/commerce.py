from typing import Any
from uuid import UUID

from fastapi import APIRouter, Header, Query

from app.modules.catalog.repositories.product_repository import ProductRepository
from app.modules.customers.api.dependencies import CurrentCustomer, OptionalCustomer, DbSession
from app.modules.customers.repositories.engagement_repository import CouponUsageRepository
from app.modules.customers.schemas.auth import MessageResponse
from app.modules.customers.schemas.commerce import (
    CheckoutPreviewRequest,
    CheckoutPreviewResponse,
    CouponApplyRequest,
    CouponResultResponse,
    CouponValidateRequest,
    CustomerOrderResponse,
    CustomerOrderTrackingResponse,
    OrderCancelBody,
    PaymentCreateBody,
    PaymentVerifyBody,
)
from app.modules.customers.services.commerce_service import CommerceService
from app.modules.fulfillment.repositories import ShipmentRepository
from app.modules.inventory.repositories import InventoryItemRepository
from app.modules.orders.repositories.address_repository import AddressRepository
from app.modules.orders.repositories.cart_repository import CartRepository
from app.modules.orders.repositories.order_repository import OrderRepository
from app.modules.settings.repositories import CouponRepository

coupons_router = APIRouter(prefix="/coupons", tags=["Coupons"])
checkout_router = APIRouter(prefix="/checkout", tags=["Checkout"])
payments_router = APIRouter(prefix="/payments", tags=["Payments"])
orders_router = APIRouter(prefix="/orders", tags=["Customer Orders"])


def get_service(db: DbSession) -> CommerceService:
    return CommerceService(
        db,
        CartRepository(db),
        ProductRepository(db),
        OrderRepository(db),
        AddressRepository(db),
        InventoryItemRepository(db),
        CouponRepository(db),
        CouponUsageRepository(db),
        ShipmentRepository(db),
    )


def _cart_id(x_cart_id: str | None) -> UUID | None:
    if not x_cart_id:
        return None
    try:
        return UUID(x_cart_id)
    except ValueError:
        return None


@coupons_router.post("/validate", response_model=CouponResultResponse)
def validate_coupon(payload: CouponValidateRequest, db: DbSession) -> CouponResultResponse:
    return get_service(db).validate_coupon(payload)


@coupons_router.post("/apply", response_model=CouponResultResponse)
def apply_coupon(
    payload: CouponApplyRequest,
    db: DbSession,
    customer: OptionalCustomer,
    x_cart_id: str | None = Header(default=None, alias="X-Cart-Id"),
) -> CouponResultResponse:
    return get_service(db).apply_coupon(
        payload, cart_id_header=_cart_id(x_cart_id), customer=customer
    )


@coupons_router.delete("/remove", response_model=MessageResponse)
def remove_coupon(
    db: DbSession,
    customer: OptionalCustomer,
    x_cart_id: str | None = Header(default=None, alias="X-Cart-Id"),
) -> MessageResponse:
    return get_service(db).remove_coupon(
        cart_id_header=_cart_id(x_cart_id), customer=customer
    )


@checkout_router.post("/preview", response_model=CheckoutPreviewResponse)
def preview_checkout(
    payload: CheckoutPreviewRequest,
    db: DbSession,
    customer: OptionalCustomer,
    x_cart_id: str | None = Header(default=None, alias="X-Cart-Id"),
) -> CheckoutPreviewResponse:
    return get_service(db).preview_checkout(
        payload, cart_id_header=_cart_id(x_cart_id), customer=customer
    )


@checkout_router.post("/validate", response_model=CheckoutPreviewResponse)
def validate_checkout(
    payload: CheckoutPreviewRequest,
    db: DbSession,
    customer: OptionalCustomer,
    x_cart_id: str | None = Header(default=None, alias="X-Cart-Id"),
) -> CheckoutPreviewResponse:
    return get_service(db).validate_checkout(
        payload, cart_id_header=_cart_id(x_cart_id), customer=customer
    )


@checkout_router.post("/create-order", response_model=CustomerOrderResponse)
def create_order(
    payload: CheckoutPreviewRequest,
    db: DbSession,
    customer: CurrentCustomer,
    x_cart_id: str | None = Header(default=None, alias="X-Cart-Id"),
) -> CustomerOrderResponse:
    return get_service(db).create_order(
        payload, cart_id_header=_cart_id(x_cart_id), customer=customer
    )


@payments_router.post("/create")
def create_payment(
    payload: PaymentCreateBody, customer: CurrentCustomer, db: DbSession
) -> Any:
    return get_service(db).create_payment(customer, payload)


@payments_router.post("/verify")
def verify_payment(
    payload: PaymentVerifyBody, customer: CurrentCustomer, db: DbSession
) -> dict:
    return get_service(db).verify_payment(customer, payload)


@payments_router.post("/webhook")
def payment_webhook() -> dict:
    return {"status": "ok", "message": "Use admin payment webhook for sandbox capture"}


@payments_router.post("/retry")
def retry_payment(
    payload: PaymentCreateBody, customer: CurrentCustomer, db: DbSession
) -> Any:
    return get_service(db).create_payment(customer, payload)


@orders_router.get("", response_model=list[CustomerOrderResponse])
def list_orders(
    customer: CurrentCustomer,
    db: DbSession,
    status: str | None = Query(default=None),
) -> list[CustomerOrderResponse]:
    return get_service(db).list_orders(customer, status=status)


@orders_router.get("/tracking/{order_number}", response_model=CustomerOrderTrackingResponse)
def track_order(
    order_number: str, customer: CurrentCustomer, db: DbSession
) -> CustomerOrderTrackingResponse:
    return get_service(db).track_order(customer, order_number)


@orders_router.get("/{order_id}", response_model=CustomerOrderResponse)
def get_order(
    order_id: UUID, customer: CurrentCustomer, db: DbSession
) -> CustomerOrderResponse:
    return get_service(db).get_order(customer, order_id)


@orders_router.post("/{order_id}/cancel", response_model=CustomerOrderResponse)
def cancel_order(
    order_id: UUID,
    payload: OrderCancelBody,
    customer: CurrentCustomer,
    db: DbSession,
) -> CustomerOrderResponse:
    return get_service(db).cancel_order(customer, order_id, payload.reason)
