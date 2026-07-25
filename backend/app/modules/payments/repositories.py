from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.payments.models import Payment, PaymentEvent, Refund


class PaymentRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self) -> list[Payment]:
        statement = select(Payment).order_by(Payment.created_at.desc())
        return list(self.db.scalars(statement).all())

    def get(self, payment_id: int) -> Payment | None:
        return self.db.get(Payment, payment_id)

    def get_by_provider_order_id(self, provider_order_id: str) -> Payment | None:
        return self.db.scalar(
            select(Payment).where(Payment.provider_order_id == provider_order_id)
        )

    def get_for_order(self, order_id: int) -> list[Payment]:
        statement = (
            select(Payment)
            .where(Payment.order_id == order_id)
            .order_by(Payment.created_at.desc())
        )
        return list(self.db.scalars(statement).all())

    def create(self, **fields) -> Payment:
        row = Payment(**fields)
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def save(self, row: Payment) -> Payment:
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row


class PaymentEventRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_event_id(self, event_id: str) -> PaymentEvent | None:
        return self.db.scalar(
            select(PaymentEvent).where(PaymentEvent.event_id == event_id)
        )

    def create(self, **fields) -> PaymentEvent:
        row = PaymentEvent(**fields)
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row


class RefundRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_for_payment(self, payment_id: int) -> list[Refund]:
        statement = (
            select(Refund)
            .where(Refund.payment_id == payment_id)
            .order_by(Refund.created_at.desc())
        )
        return list(self.db.scalars(statement).all())

    def create(self, **fields) -> Refund:
        row = Refund(**fields)
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row
