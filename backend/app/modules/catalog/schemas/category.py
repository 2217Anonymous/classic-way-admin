from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CategoryCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    slug: str | None = Field(default=None, min_length=2, max_length=140)
    description: str | None = Field(default=None, max_length=2000)
    parent_id: int | None = None
    is_active: bool = True
    sort_order: int = Field(default=0, ge=0, le=9999)


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    slug: str | None = Field(default=None, min_length=2, max_length=140)
    description: str | None = Field(default=None, max_length=2000)
    parent_id: int | None = None
    is_active: bool | None = None
    sort_order: int | None = Field(default=None, ge=0, le=9999)


class CategoryResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: str | None
    image_url: str | None = None
    parent_id: int | None
    is_active: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CategoryTreeNode(CategoryResponse):
    children: list["CategoryTreeNode"] = Field(default_factory=list)


class CategoryDeleteResponse(BaseModel):
    deleted_ids: list[int]
