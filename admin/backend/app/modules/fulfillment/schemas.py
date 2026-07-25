from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class CourierAccountResponse(BaseModel):
    id: int
    provider: str
    name: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ShipmentCreateRequest(BaseModel):
    order_id: int
    provider: str = Field(default="manual", max_length=30)


class PickupScheduleRequest(BaseModel):
    pickup_at: datetime | None = None


class ShipmentEventCreate(BaseModel):
    status: str = Field(min_length=1, max_length=30)
    message: str | None = Field(default=None, max_length=255)
    source: str = Field(default="manual", pattern=r"^(webhook|poll|manual)$")
    event_at: datetime | None = None


class ShipmentExceptionRequest(BaseModel):
    reason: str = Field(min_length=2, max_length=255)


class ShipmentEventResponse(BaseModel):
    id: int
    shipment_id: int
    status: str
    message: str | None
    event_at: datetime
    source: str

    model_config = ConfigDict(from_attributes=True)


class ShipmentResponse(BaseModel):
    id: int
    order_id: int
    courier_provider: str
    awb: str | None
    label_url: str | None
    status: str
    pickup_scheduled_at: datetime | None
    exception_flag: bool
    exception_reason: str | None
    events: list[ShipmentEventResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TrackingResponse(BaseModel):
    order_number: str
    status: str
    total: Decimal
    currency: str
    created_at: datetime
    shipments: list[ShipmentResponse] = Field(default_factory=list)
