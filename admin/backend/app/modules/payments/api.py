from typing import Annotated

from fastapi import APIRouter, Depends, Header, status

from app.modules.catalog.repositories.product_repository import ProductRepository
from app.modules.iam.api.dependencies import AdminUser, require_roles
from app.modules.iam.constants import MANAGER_ROLE, VIEWER_ROLE
from app.modules.identity.api.dependencies import DbSession
from app.modules.identity.models.user import User
from app.modules.inventory.repositories import InventoryItemRepository
from app.modules.orders.repositories.address_repository import AddressRepository
from app.modules.orders.repositories.cart_repository import CartRepository
from app.modules.orders.repositories.order_repository import OrderRepository
from app.modules.orders.services.order_service import OrderService
from app.modules.payments.repositories import (
    PaymentEventRepository,
    PaymentRepository,
    RefundRepository,
)
from app.modules.payments.schemas import (
    PaymentCreateRequest,
    PaymentResponse,
    RazorpayWebhookPayload,
    RefundRequest,
    RefundResponse,
    WebhookAck,
)
from app.modules.payments.services import PaymentService
from app.modules.settings.repositories import CouponRepository

router = APIRouter(prefix="/payments", tags=["Payments"])


def get_service(db: DbSession) -> PaymentService:
    order_service = OrderService(
        OrderRepository(db),
        CartRepository(db),
        AddressRepository(db),
        InventoryItemRepository(db),
        CouponRepository(db),
        ProductRepository(db),
    )
    return PaymentService(
        PaymentRepository(db),
        PaymentEventRepository(db),
        RefundRepository(db),
        OrderRepository(db),
        order_service,
    )


@router.get("", response_model=list[PaymentResponse])
def list_payments(
    db: DbSession,
    _: Annotated[User, Depends(require_roles(MANAGER_ROLE, VIEWER_ROLE))],
) -> list[PaymentResponse]:
    return get_service(db).list_payments()


@router.post(
    "/razorpay/create",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_razorpay_payment(
    payload: PaymentCreateRequest, db: DbSession, _: AdminUser
) -> PaymentResponse:
    return get_service(db).create_razorpay_payment(payload)


@router.post("/razorpay/webhook", response_model=WebhookAck)
def razorpay_webhook(
    payload: RazorpayWebhookPayload,
    db: DbSession,
    x_demo_signature: Annotated[str | None, Header(alias="X-Demo-Signature")] = None,
) -> WebhookAck:
    # No AdminUser dependency: payment providers call this endpoint directly.
    # Demo signature verification accepts header `X-Demo-Signature: ok`.
    signature_valid = (x_demo_signature or "").strip().lower() == "ok"
    return get_service(db).handle_webhook(payload, signature_valid)


@router.post("/{payment_id}/refund", response_model=RefundResponse)
def refund_payment(
    payment_id: int, payload: RefundRequest, db: DbSession, _: AdminUser
) -> RefundResponse:
    return get_service(db).refund(payment_id, payload)
