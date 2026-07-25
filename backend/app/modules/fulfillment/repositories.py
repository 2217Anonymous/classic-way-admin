from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.modules.fulfillment.models import CourierAccount, Shipment, ShipmentEvent

INACTIVE_SHIPMENT_STATUSES = ("delivered", "cancelled", "rto")


class CourierAccountRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self) -> list[CourierAccount]:
        statement = select(CourierAccount).order_by(CourierAccount.id.asc())
        return list(self.db.scalars(statement).all())

    def get_active_default(self) -> CourierAccount | None:
        statement = (
            select(CourierAccount)
            .where(CourierAccount.is_active.is_(True))
            .order_by(CourierAccount.id.asc())
        )
        return self.db.scalar(statement)

    def create(self, **fields) -> CourierAccount:
        row = CourierAccount(**fields)
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row


class ShipmentRepository:
    def __init__(self, db: Session):
        self.db = db

    def _options(self):
        return (selectinload(Shipment.events),)

    def list(self) -> list[Shipment]:
        statement = (
            select(Shipment).options(*self._options()).order_by(Shipment.created_at.desc())
        )
        return list(self.db.scalars(statement).unique().all())

    def get(self, shipment_id: int) -> Shipment | None:
        statement = (
            select(Shipment)
            .where(Shipment.id == shipment_id)
            .options(*self._options())
        )
        return self.db.scalars(statement).unique().first()

    def get_for_order(self, order_id: int) -> list[Shipment]:
        statement = (
            select(Shipment)
            .where(Shipment.order_id == order_id)
            .options(*self._options())
            .order_by(Shipment.created_at.desc())
        )
        return list(self.db.scalars(statement).unique().all())

    def create(self, **fields) -> Shipment:
        row = Shipment(**fields)
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return self.get(row.id) or row

    def save(self, row: Shipment) -> Shipment:
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return self.get(row.id) or row

    def add_event(self, event: ShipmentEvent) -> ShipmentEvent:
        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)
        shipment = self.db.get(Shipment, event.shipment_id)
        if shipment is not None:
            self.db.expire(shipment, ["events"])
        return event

    def count_active(self) -> int:
        statement = select(func.count(Shipment.id)).where(
            Shipment.status.notin_(INACTIVE_SHIPMENT_STATUSES)
        )
        return self.db.scalar(statement) or 0
