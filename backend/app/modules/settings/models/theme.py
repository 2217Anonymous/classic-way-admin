from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Theme(Base):
    """Global default theme (customer_id NULL, is_default=True) or per-customer theme."""

    __tablename__ = "theme"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    customer_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=True,
        unique=True,
        index=True,
    )
    home_theme: Mapped[str] = mapped_column(String(100), default="fashion")
    shop_category: Mapped[str] = mapped_column(String(50), default="classic")
    shop_layout: Mapped[str] = mapped_column(String(100), default="full-width")
    product_layout: Mapped[str] = mapped_column(String(100), default="full-width")
    blog_layout: Mapped[str] = mapped_column(String(100), default="full-width")
    page_visibility: Mapped[dict] = mapped_column(JSON, default=dict)
    theme_config: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )
