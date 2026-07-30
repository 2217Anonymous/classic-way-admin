from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ReviewImageResponse(BaseModel):
    id: UUID
    url: str
    sort_order: int

    model_config = ConfigDict(from_attributes=True)


class ReviewResponse(BaseModel):
    id: UUID
    product_id: UUID
    product_name: str | None = None
    customer_id: UUID
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


class ReviewCreate(BaseModel):
    product_id: UUID
    rating: int = Field(ge=1, le=5)
    title: str | None = Field(default=None, max_length=200)
    body: str | None = Field(default=None, max_length=5000)


class WishlistItemResponse(BaseModel):
    id: UUID
    product_id: UUID
    product_name: str | None = None
    product_slug: str | None = None
    product_price: Decimal | None = None
    product_image: str | None = None


class WishlistResponse(BaseModel):
    id: UUID
    customer_id: UUID
    items: list[WishlistItemResponse] = Field(default_factory=list)
    item_count: int = 0


class WishlistItemCreate(BaseModel):
    product_id: UUID


class CompareItemResponse(BaseModel):
    id: UUID
    product_id: UUID
    product_name: str | None = None
    product_slug: str | None = None
    product_price: Decimal | None = None
    product_image: str | None = None


class CompareResponse(BaseModel):
    id: UUID
    customer_id: UUID
    items: list[CompareItemResponse] = Field(default_factory=list)
    item_count: int = 0


class CompareItemCreate(BaseModel):
    product_id: UUID


class FeedbackCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    email: EmailStr
    subject: str = Field(min_length=2, max_length=200)
    message: str = Field(min_length=2, max_length=5000)


class FeedbackResponse(BaseModel):
    id: UUID
    customer_id: UUID | None
    name: str
    email: EmailStr
    subject: str
    message: str
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
