from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ReviewImageResponse(BaseModel):
    id: int
    url: str
    sort_order: int

    model_config = ConfigDict(from_attributes=True)


class ReviewResponse(BaseModel):
    id: int
    product_id: int
    customer_id: int
    customer_name: str | None = None
    rating: int
    title: str | None
    body: str | None
    is_verified_purchase: bool
    is_approved: bool
    images: list[ReviewImageResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
