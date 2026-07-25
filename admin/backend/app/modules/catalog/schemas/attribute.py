from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class AttributeDefinitionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    values: list[str] = Field(default_factory=list)
    sort_order: int = Field(default=0, ge=0, le=9999)
    is_active: bool = True


class AttributeDefinitionUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    values: list[str] | None = None
    sort_order: int | None = Field(default=None, ge=0, le=9999)
    is_active: bool | None = None


class AttributeDefinitionResponse(BaseModel):
    id: int
    name: str
    values: list[Any] = Field(default_factory=list)
    sort_order: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
