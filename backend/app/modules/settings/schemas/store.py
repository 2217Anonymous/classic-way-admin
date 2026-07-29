from datetime import datetime
from uuid import UUID

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
    id: UUID
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
