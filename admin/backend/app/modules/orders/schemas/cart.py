from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class CartCreate(BaseModel):
    session_key: str | None = Field(default=None, max_length=120)
    user_id: int | None = None
    customer_id: int | None = None


class CartItemCreate(BaseModel):
    product_id: int
    variant_id: int | None = None
    quantity: int = Field(default=1, ge=1, le=999)


class CartItemUpdate(BaseModel):
    quantity: int = Field(ge=1, le=999)


class CartItemResponse(BaseModel):
    id: int
    cart_id: int
    product_id: int
    variant_id: int | None
    quantity: int
    unit_price: Decimal
    product_name: str
    sku: str | None
    line_total: Decimal

    model_config = ConfigDict(from_attributes=True)


class CartResponse(BaseModel):
    id: int
    session_key: str | None
    user_id: int | None
    customer_id: int | None = None
    coupon_code: str | None = None
    items: list[CartItemResponse] = Field(default_factory=list)
    subtotal: Decimal
    item_count: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
