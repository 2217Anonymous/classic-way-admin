from __future__ import annotations

import random
import string

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
from app.utils.exceptions import AppError, NotFoundError

CAPTURE_EVENT_TYPES = {"payment.captured", "payment.authorized", "order.paid"}
FAILURE_EVENT_TYPES = {"payment.failed"}


def _demo_id(prefix: str) -> str:
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=14))
    return f"{prefix}_demo_{suffix}"


class PaymentService:
    """VL-020/VL-021/VL-022 — sandbox Razorpay-style payment orchestration."""

    def __init__(
        self,
        repository: PaymentRepository,
        event_repository: PaymentEventRepository,
        refund_repository: RefundRepository,
        order_repository: OrderRepository,
        order_service: OrderService,
    ):
        self.repository = repository
        self.event_repository = event_repository
        self.refund_repository = refund_repository
        self.order_repository = order_repository
        self.order_service = order_service

    def list_payments(self) -> list[PaymentResponse]:
        return [PaymentResponse.model_validate(row) for row in self.repository.list()]

    def create_razorpay_payment(self, payload: PaymentCreateRequest) -> PaymentResponse:
        order = self.order_repository.get(payload.order_id)
        if not order:
            raise NotFoundError("Order not found")
        if order.status not in {"pending", "draft"}:
            raise AppError(
                f"Cannot start a payment for an order in status '{order.status}'", 400
            )

        payment = self.repository.create(
            order_id=order.id,
            provider="razorpay",
            provider_order_id=_demo_id("order"),
            amount=order.total,
            currency=order.currency,
            status="created",
        )
        return PaymentResponse.model_validate(payment)

    def handle_webhook(
        self, payload: RazorpayWebhookPayload, signature_valid: bool
    ) -> WebhookAck:
        if self.event_repository.get_by_event_id(payload.event_id):
            # Idempotent replay — already processed this event_id.
            return WebhookAck(status="duplicate", event_id=payload.event_id)

        payment = None
        if payload.provider_order_id:
            payment = self.repository.get_by_provider_order_id(payload.provider_order_id)

        self.event_repository.create(
            payment_id=payment.id if payment else None,
            event_id=payload.event_id,
            event_type=payload.event_type,
            signature_valid=signature_valid,
            payload=payload.model_dump_json(),
        )

        if not signature_valid:
            raise AppError("Invalid webhook signature", 400)

        if payment and payload.event_type in CAPTURE_EVENT_TYPES:
            payment.status = "paid"
            payment.provider_payment_id = payload.provider_payment_id or _demo_id("pay")
            payment.method = payload.method or payment.method
            self.repository.save(payment)
            self.order_service.mark_paid(
                payment.order_id, note="Payment captured via webhook"
            )
        elif payment and payload.event_type in FAILURE_EVENT_TYPES:
            payment.status = "failed"
            self.repository.save(payment)

        return WebhookAck(status="processed", event_id=payload.event_id)

    def refund(self, payment_id: int, payload: RefundRequest) -> RefundResponse:
        payment = self.repository.get(payment_id)
        if not payment:
            raise NotFoundError("Payment not found")
        if payment.status != "paid":
            raise AppError("Only paid payments can be refunded", 400)

        amount = payload.amount if payload.amount is not None else payment.amount
        if amount > payment.amount:
            raise AppError("Refund amount cannot exceed the payment amount", 400)

        refund = self.refund_repository.create(
            payment_id=payment.id,
            order_id=payment.order_id,
            amount=amount,
            reason=payload.reason,
            status="processed",
            provider_refund_id=_demo_id("rfnd"),
        )

        payment.status = "refunded"
        self.repository.save(payment)
        self.order_service.mark_refunded(payment.order_id, note=payload.reason)

        return RefundResponse.model_validate(refund)
