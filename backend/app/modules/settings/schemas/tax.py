from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


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
    id: UUID
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
