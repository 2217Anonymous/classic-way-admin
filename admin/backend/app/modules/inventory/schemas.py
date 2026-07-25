from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class InventorySettingsResponse(BaseModel):
    id: int
    low_stock_threshold: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InventorySettingsUpdate(BaseModel):
    low_stock_threshold: int = Field(ge=0, le=1_000_000)


class InventoryItemResponse(BaseModel):
    id: int
    product_id: int | None
    variant_id: int | None
    sku: str | None
    quantity: int
    reserved: int
    available: int
    is_low_stock: bool
    product_name: str | None = None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StockAdjustRequest(BaseModel):
    delta: int = Field(description="Positive to add stock, negative to remove")
    reason: str = Field(min_length=2, max_length=160)
    reference: str | None = Field(default=None, max_length=160)


class StockMovementResponse(BaseModel):
    id: int
    inventory_item_id: int
    delta: int
    reason: str
    reference: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
