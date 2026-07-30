from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ThemeUpdate(BaseModel):
    home_theme: str = Field(min_length=2, max_length=100)
    shop_category: str = Field(min_length=2, max_length=50)
    shop_layout: str = Field(min_length=2, max_length=100)
    product_layout: str = Field(min_length=2, max_length=100)
    blog_layout: str = Field(min_length=2, max_length=100)
    page_visibility: dict[str, bool] | None = None
    theme_config: dict | None = None


class ThemeResponse(BaseModel):
    id: UUID
    customer_id: UUID | None
    home_theme: str
    shop_category: str
    shop_layout: str
    product_layout: str
    blog_layout: str
    page_visibility: dict[str, bool]
    theme_config: dict | None
    is_default: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime
    # Convenience: whether this payload is the global default (vs customer override)
    source: str = "default"

    model_config = ConfigDict(from_attributes=True)
