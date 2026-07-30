from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ProductAttributeInput(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    values: list[str] = Field(default_factory=list)
    sort_order: int = Field(default=0, ge=0, le=9999)


class ProductVariantInput(BaseModel):
    sku: str = Field(min_length=1, max_length=64)
    price: Decimal | None = Field(default=None, ge=0)
    stock: int = Field(default=0, ge=0)
    options: dict[str, str] = Field(default_factory=dict)
    is_active: bool = True
    sort_order: int = Field(default=0, ge=0, le=9999)


class ProductCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    slug: str | None = Field(default=None, min_length=2, max_length=180)
    description: str | None = Field(default=None, max_length=20000)
    short_description: str | None = Field(default=None, max_length=2000)
    price: Decimal = Field(ge=0)
    compare_at_price: Decimal | None = Field(default=None, ge=0)
    discount_percent: Decimal | None = Field(default=None, ge=0, le=100)
    sku: str | None = Field(default=None, min_length=1, max_length=64)
    manufacturer_name: str | None = Field(default=None, max_length=160)
    manufacturer_brand: str | None = Field(default=None, max_length=160)
    stock: int = Field(default=0, ge=0)
    tags: str | None = Field(default=None, max_length=500)
    visibility: str = Field(default="public", max_length=32)
    published_at: datetime | None = None
    category_id: UUID | None = None
    brand_id: UUID | None = None
    is_published: bool = False
    is_active: bool = True
    is_featured: bool = False
    is_trending: bool = False
    is_best_seller: bool = False
    exchangeable: bool = False
    refundable: bool = False
    sort_order: int = Field(default=0, ge=0, le=9999)
    attributes: list[ProductAttributeInput] = Field(default_factory=list)
    variants: list[ProductVariantInput] = Field(default_factory=list)


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    slug: str | None = Field(default=None, min_length=2, max_length=180)
    description: str | None = Field(default=None, max_length=20000)
    short_description: str | None = Field(default=None, max_length=2000)
    price: Decimal | None = Field(default=None, ge=0)
    compare_at_price: Decimal | None = Field(default=None, ge=0)
    discount_percent: Decimal | None = Field(default=None, ge=0, le=100)
    sku: str | None = Field(default=None, min_length=1, max_length=64)
    manufacturer_name: str | None = Field(default=None, max_length=160)
    manufacturer_brand: str | None = Field(default=None, max_length=160)
    stock: int | None = Field(default=None, ge=0)
    tags: str | None = Field(default=None, max_length=500)
    visibility: str | None = Field(default=None, max_length=32)
    published_at: datetime | None = None
    category_id: UUID | None = None
    brand_id: UUID | None = None
    is_published: bool | None = None
    is_active: bool | None = None
    is_featured: bool | None = None
    is_trending: bool | None = None
    is_best_seller: bool | None = None
    exchangeable: bool | None = None
    refundable: bool | None = None
    sort_order: int | None = Field(default=None, ge=0, le=9999)
    attributes: list[ProductAttributeInput] | None = None
    variants: list[ProductVariantInput] | None = None


class ProductMediaResponse(BaseModel):
    id: UUID
    product_id: UUID
    url: str
    large_url: str | None = None
    medium_url: str | None = None
    thumbnail_url: str | None = None
    original_filename: str | None = None
    alt_text: str | None
    sort_order: int
    is_primary: bool
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class ProductMediaOrderUpdate(BaseModel):
    media_ids: list[UUID] = Field(min_length=1)


class ProductAttributeResponse(BaseModel):
    id: UUID
    product_id: UUID
    name: str
    values: list[Any] = Field(default_factory=list)
    sort_order: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProductVariantResponse(BaseModel):
    id: UUID
    product_id: UUID
    sku: str
    price: Decimal | None
    stock: int
    options: dict[str, Any] = Field(default_factory=dict)
    is_active: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProductResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    description: str | None
    short_description: str | None = None
    price: Decimal
    compare_at_price: Decimal | None
    discount_percent: Decimal | None = None
    sku: str | None
    manufacturer_name: str | None = None
    manufacturer_brand: str | None = None
    stock: int = 0
    tags: str | None = None
    visibility: str = "public"
    published_at: datetime | None = None
    category_id: UUID | None
    category_name: str | None = None
    brand_id: UUID | None = None
    is_published: bool
    is_active: bool
    is_featured: bool = False
    is_trending: bool = False
    is_best_seller: bool = False
    seo_title: str | None = None
    seo_description: str | None = None
    exchangeable: bool = False
    refundable: bool = False
    sort_order: int
    primary_image_url: str | None = None
    media: list[ProductMediaResponse] = Field(default_factory=list)
    attributes: list[ProductAttributeResponse] = Field(default_factory=list)
    variants: list[ProductVariantResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
