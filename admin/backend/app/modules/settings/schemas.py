from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class StoreSettingsUpdate(BaseModel):
    store_name: str = Field(min_length=2, max_length=160)
    legal_name: str | None = Field(default=None, max_length=200)
    email: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=40)
    address_line1: str | None = Field(default=None, max_length=255)
    address_line2: str | None = Field(default=None, max_length=255)
    city: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    postal_code: str | None = Field(default=None, max_length=20)
    country: str | None = Field(default=None, max_length=100)
    currency: str = Field(default="INR", min_length=3, max_length=8)
    timezone: str = Field(default="Asia/Kolkata", min_length=3, max_length=64)


class StoreSettingsResponse(BaseModel):
    id: int
    store_name: str
    legal_name: str | None
    email: str | None
    phone: str | None
    address_line1: str | None
    address_line2: str | None
    city: str | None
    state: str | None
    postal_code: str | None
    country: str | None
    currency: str
    timezone: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TaxRuleCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    code: str = Field(min_length=1, max_length=40)
    rate_percent: Decimal = Field(ge=0, le=100)
    is_inclusive: bool = False
    country: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    is_active: bool = True
    sort_order: int = Field(default=0, ge=0, le=9999)


class TaxRuleUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    code: str | None = Field(default=None, min_length=1, max_length=40)
    rate_percent: Decimal | None = Field(default=None, ge=0, le=100)
    is_inclusive: bool | None = None
    country: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    is_active: bool | None = None
    sort_order: int | None = Field(default=None, ge=0, le=9999)


class TaxRuleResponse(BaseModel):
    id: int
    name: str
    code: str
    rate_percent: Decimal
    is_inclusive: bool
    country: str | None
    state: str | None
    is_active: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CouponCreate(BaseModel):
    code: str = Field(min_length=2, max_length=40)
    name: str = Field(min_length=2, max_length=160)
    discount_type: str = Field(pattern=r"^(percent|fixed)$")
    discount_value: Decimal = Field(ge=0)
    min_order_amount: Decimal | None = Field(default=None, ge=0)
    max_uses: int | None = Field(default=None, ge=1)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    is_active: bool = True


class CouponUpdate(BaseModel):
    code: str | None = Field(default=None, min_length=2, max_length=40)
    name: str | None = Field(default=None, min_length=2, max_length=160)
    discount_type: str | None = Field(default=None, pattern=r"^(percent|fixed)$")
    discount_value: Decimal | None = Field(default=None, ge=0)
    min_order_amount: Decimal | None = Field(default=None, ge=0)
    max_uses: int | None = Field(default=None, ge=1)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    is_active: bool | None = None


class CouponResponse(BaseModel):
    id: int
    code: str
    name: str
    discount_type: str
    discount_value: Decimal
    min_order_amount: Decimal | None
    max_uses: int | None
    used_count: int
    starts_at: datetime | None
    ends_at: datetime | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
