from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class PaymentCreateRequest(BaseModel):
    order_id: int


class PaymentResponse(BaseModel):
    id: int
    order_id: int
    provider: str
    provider_order_id: str | None
    provider_payment_id: str | None
    amount: Decimal
    currency: str
    status: str
    method: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RazorpayWebhookPayload(BaseModel):
    """Demo webhook body. Real Razorpay events carry more fields; only the
    subset needed to drive the sandbox flow is modelled here."""

    event_id: str = Field(min_length=1, max_length=120)
    event_type: str = Field(min_length=1, max_length=60)
    provider_order_id: str | None = None
    provider_payment_id: str | None = None
    method: str | None = None


class WebhookAck(BaseModel):
    status: str
    event_id: str


class RefundRequest(BaseModel):
    amount: Decimal | None = Field(default=None, ge=0)
    reason: str | None = Field(default=None, max_length=255)


class RefundResponse(BaseModel):
    id: int
    payment_id: int
    order_id: int
    amount: Decimal
    reason: str | None
    status: str
    provider_refund_id: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
