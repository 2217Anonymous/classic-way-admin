from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.modules.catalog.schemas.product import ProductResponse
from app.modules.orders.schemas.order import CheckoutAddressInput


class ProductListResponse(BaseModel):
    items: list[ProductResponse]
    total: int
    page: int
    limit: int
    pages: int


class CouponValidateRequest(BaseModel):
    code: str = Field(min_length=1, max_length=40)
    subtotal: Decimal = Field(ge=0)


class CouponApplyRequest(BaseModel):
    code: str = Field(min_length=1, max_length=40)
    cart_id: UUID | None = None


class CouponResultResponse(BaseModel):
    code: str
    discount_type: str
    discount_value: Decimal
    discount_amount: Decimal
    message: str


class CheckoutPreviewRequest(BaseModel):
    cart_id: UUID | None = None
    address_id: UUID | None = None
    address: CheckoutAddressInput | None = None
    coupon_code: str | None = Field(default=None, max_length=40)
    payment_method: Literal["razorpay", "cod"] = "cod"
    notes: str | None = Field(default=None, max_length=1000)


class CheckoutPreviewResponse(BaseModel):
    subtotal: Decimal
    shipping_amount: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    total: Decimal
    coupon_code: str | None = None
    item_count: int
    currency: str = "INR"


class CustomerOrderItemResponse(BaseModel):
    id: UUID
    name: str
    quantity: int
    unit_price: Decimal
    line_total: Decimal

    model_config = ConfigDict(from_attributes=True)


class CustomerOrderResponse(BaseModel):
    id: UUID
    order_number: str
    status: str
    payment_method: str
    subtotal: Decimal
    shipping_amount: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    total: Decimal
    currency: str
    items: list[CustomerOrderItemResponse] = Field(default_factory=list)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrderCancelBody(BaseModel):
    reason: str | None = Field(default=None, max_length=255)


class ShipmentEventBrief(BaseModel):
    status: str | None = None
    description: str | None = None
    location: str | None = None
    occurred_at: datetime | None = None
    source: str | None = None


class StatusHistoryBrief(BaseModel):
    from_status: str | None = None
    to_status: str | None = None
    note: str | None = None
    created_at: datetime | None = None
    status: str | None = None


class CustomerOrderTrackingResponse(BaseModel):
    order_number: str
    status: str
    status_history: list[StatusHistoryBrief] = Field(default_factory=list)
    shipping_city: str | None = None
    created_at: datetime
    awb: str | None = None
    shipment_status: str | None = None
    shipment_events: list[ShipmentEventBrief] | None = None


class CartMergeRequest(BaseModel):
    guest_cart_id: UUID | None = None


class PaymentCreateBody(BaseModel):
    order_id: UUID
    provider: Literal["razorpay", "cod"] = "razorpay"


class PaymentVerifyBody(BaseModel):
    order_id: UUID
    provider_order_id: str | None = None
    provider_payment_id: str | None = None
