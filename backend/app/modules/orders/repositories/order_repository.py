from __future__ import annotations

from uuid import UUID
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.modules.orders.models.order import Order, OrderItem, OrderStatusHistory


class OrderRepository:
    def __init__(self, db: Session):
        self.db = db

    def _options(self):
        return (
            selectinload(Order.items),
            selectinload(Order.status_history),
        )

    def list(self, status: str | None = None) -> list[Order]:
        statement = (
            select(Order).options(*self._options()).order_by(Order.created_at.desc())
        )
        if status:
            statement = statement.where(Order.status == status)
        return list(self.db.scalars(statement).unique().all())

    def list_for_customer(
        self, customer_id: UUID, status: str | None = None
    ) -> list[Order]:
        statement = (
            select(Order)
            .where(Order.customer_id == customer_id)
            .options(*self._options())
            .order_by(Order.created_at.desc())
        )
        if status:
            statement = statement.where(Order.status == status)
        return list(self.db.scalars(statement).unique().all())

    def get(self, order_id: UUID) -> Order | None:
        statement = (
            select(Order).where(Order.id == order_id).options(*self._options())
        )
        return self.db.scalars(statement).unique().first()

    def get_by_number(self, order_number: str) -> Order | None:
        statement = (
            select(Order)
            .where(Order.order_number == order_number)
            .options(*self._options())
        )
        return self.db.scalars(statement).unique().first()

    def create(self, **fields) -> Order:
        order = Order(**fields)
        self.db.add(order)
        self.db.commit()
        self.db.refresh(order)
        return self.get(order.id) or order

    def save(self, order: Order) -> Order:
        self.db.add(order)
        self.db.commit()
        self.db.refresh(order)
        return self.get(order.id) or order

    def add_item(self, item: OrderItem) -> OrderItem:
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        self._expire_collections(item.order_id)
        return item

    def add_status_history(self, entry: OrderStatusHistory) -> OrderStatusHistory:
        self.db.add(entry)
        self.db.commit()
        self.db.refresh(entry)
        self._expire_collections(entry.order_id)
        return entry

    def _expire_collections(self, order_id: UUID) -> None:
        order = self.db.get(Order, order_id)
        if order is not None:
            self.db.expire(order, ["items", "status_history"])

    def count(self, status: str | None = None) -> int:
        statement = select(func.count(Order.id))
        if status:
            statement = statement.where(Order.status == status)
        return self.db.scalar(statement) or 0

    def sum_revenue(self, statuses: list[str]) -> float:
        statement = select(func.coalesce(func.sum(Order.total), 0)).where(
            Order.status.in_(statuses)
        )
        return float(self.db.scalar(statement) or 0)
