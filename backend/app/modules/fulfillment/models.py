from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class CourierAccount(Base):
    """VL-023 — a configured courier/shipping partner account."""

    __tablename__ = "courier_accounts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    provider: Mapped[str] = mapped_column(String(30), default="manual")
    name: Mapped[str] = mapped_column(String(120))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    config_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )


class Shipment(Base):
    """VL-023/VL-024 — a shipment created for an order (manual/sandbox courier)."""

    __tablename__ = "shipments"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(
        ForeignKey("orders.id", ondelete="CASCADE"), index=True
    )
    courier_provider: Mapped[str] = mapped_column(String(30), default="manual")
    awb: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    label_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="created")
    pickup_scheduled_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True
    )
    exception_flag: Mapped[bool] = mapped_column(Boolean, default=False)
    exception_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    events: Mapped[list["ShipmentEvent"]] = relationship(
        "ShipmentEvent",
        back_populates="shipment",
        cascade="all, delete-orphan",
        order_by="ShipmentEvent.event_at.asc(), ShipmentEvent.id.asc()",
        passive_deletes=True,
    )


class ShipmentEvent(Base):
    """VL-025 — a tracking event for a shipment (webhook/poll/manual)."""

    __tablename__ = "shipment_events"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    shipment_id: Mapped[int] = mapped_column(
        ForeignKey("shipments.id", ondelete="CASCADE"), index=True
    )
    status: Mapped[str] = mapped_column(String(30))
    message: Mapped[str | None] = mapped_column(String(255), nullable=True)
    event_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    source: Mapped[str] = mapped_column(String(20), default="manual")

    shipment: Mapped[Shipment] = relationship("Shipment", back_populates="events")
