from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CheckoutAddressInput(BaseModel):
    full_name: str = Field(min_length=2, max_length=160)
    phone: str = Field(min_length=6, max_length=40)
    line1: str = Field(min_length=2, max_length=255)
    line2: str | None = Field(default=None, max_length=255)
    city: str = Field(min_length=1, max_length=100)
    state: str = Field(min_length=1, max_length=100)
    postal_code: str = Field(min_length=3, max_length=20)
    country: str = Field(default="India", max_length=100)


class CheckoutRequest(BaseModel):
    cart_id: UUID
    address_id: UUID | None = None
    address: CheckoutAddressInput | None = None
    payment_method: str = Field(pattern=r"^(razorpay|cod)$")
    coupon_code: str | None = Field(default=None, max_length=40)
    notes: str | None = Field(default=None, max_length=1000)


class AdminOrderItemInput(BaseModel):
    product_id: UUID
    variant_id: UUID | None = None
    product_name: str = Field(min_length=1, max_length=160)
    sku: str | None = Field(default=None, max_length=64)
    unit_price: Decimal = Field(ge=0)
    quantity: int = Field(ge=1, le=1000)


class AdminOrderCreateRequest(BaseModel):
    customer_id: UUID | None = None
    customer_name: str = Field(min_length=2, max_length=160)
    customer_email: str | None = Field(default=None, max_length=255)
    customer_phone: str | None = Field(default=None, max_length=40)
    items: list[AdminOrderItemInput] = Field(min_length=1)
    shipping_address: CheckoutAddressInput
    payment_method: str = Field(pattern=r"^(razorpay|cod)$")
    status: str = Field(default="pending", pattern=r"^(draft|pending|paid)$")
    discount_amount: Decimal = Field(default=Decimal("0"), ge=0)
    shipping_amount: Decimal | None = Field(default=None, ge=0)
    tax_amount: Decimal = Field(default=Decimal("0"), ge=0)
    coupon_code: str | None = Field(default=None, max_length=40)
    notes: str | None = Field(default=None, max_length=1000)


class OrderItemResponse(BaseModel):
    id: UUID
    order_id: UUID
    product_id: UUID | None
    variant_id: UUID | None
    sku: str | None
    name: str
    quantity: int
    unit_price: Decimal
    line_total: Decimal

    model_config = ConfigDict(from_attributes=True)


class OrderStatusHistoryResponse(BaseModel):
    id: UUID
    order_id: UUID
    from_status: str | None
    to_status: str
    note: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrderResponse(BaseModel):
    id: UUID
    order_number: str
    user_id: UUID | None
    customer_id: UUID | None = None
    status: str
    payment_method: str
    subtotal: Decimal
    shipping_amount: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    total: Decimal
    currency: str
    shipping_name: str | None
    shipping_phone: str | None
    shipping_line1: str | None
    shipping_line2: str | None
    shipping_city: str | None
    shipping_state: str | None
    shipping_postal_code: str | None
    shipping_country: str | None
    coupon_code: str | None
    notes: str | None
    items: list[OrderItemResponse] = Field(default_factory=list)
    status_history: list[OrderStatusHistoryResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrderCancelRequest(BaseModel):
    reason: str | None = Field(default=None, max_length=255)


class OrderStatusUpdateRequest(BaseModel):
    status: str = Field(
        pattern=r"^(pending|paid|processing|shipped|delivered|cancelled|refunded|returned)$"
    )
    note: str | None = Field(default=None, max_length=255)
