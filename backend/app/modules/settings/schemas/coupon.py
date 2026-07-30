from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


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
    id: UUID
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
