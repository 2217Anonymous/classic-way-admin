from datetime import datetime
from decimal import Decimal

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
    cart_id: int
    address_id: int | None = None
    address: CheckoutAddressInput | None = None
    payment_method: str = Field(pattern=r"^(razorpay|cod)$")
    coupon_code: str | None = Field(default=None, max_length=40)
    notes: str | None = Field(default=None, max_length=1000)


class OrderItemResponse(BaseModel):
    id: int
    order_id: int
    product_id: int | None
    variant_id: int | None
    sku: str | None
    name: str
    quantity: int
    unit_price: Decimal
    line_total: Decimal

    model_config = ConfigDict(from_attributes=True)


class OrderStatusHistoryResponse(BaseModel):
    id: int
    order_id: int
    from_status: str | None
    to_status: str
    note: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrderResponse(BaseModel):
    id: int
    order_number: str
    user_id: int | None
    customer_id: int | None = None
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
