from __future__ import annotations

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.modules.customers.models import Customer


class CustomerRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(
        self,
        *,
        search: str | None = None,
        is_active: bool | None = None,
    ) -> list[Customer]:
        statement = select(Customer).where(Customer.deleted_at.is_(None))
        if is_active is not None:
            statement = statement.where(Customer.is_active.is_(is_active))
        if search:
            term = f"%{search.strip().lower()}%"
            statement = statement.where(
                or_(
                    Customer.email.ilike(term),
                    Customer.full_name.ilike(term),
                )
            )
        statement = statement.order_by(Customer.created_at.desc())
        return list(self.db.scalars(statement).all())

    def get(self, customer_id: int) -> Customer | None:
        customer = self.db.get(Customer, customer_id)
        if customer and customer.deleted_at is None:
            return customer
        return None

    def save(self, customer: Customer) -> Customer:
        self.db.add(customer)
        self.db.commit()
        self.db.refresh(customer)
        return customer
