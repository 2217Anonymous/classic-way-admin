from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.orders.models.address import CustomerAddress


class AddressRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self, user_id: int | None = None) -> list[CustomerAddress]:
        statement = select(CustomerAddress).order_by(CustomerAddress.id.desc())
        if user_id is not None:
            statement = statement.where(CustomerAddress.user_id == user_id)
        return list(self.db.scalars(statement).all())

    def list_for_customer(self, customer_id: int) -> list[CustomerAddress]:
        statement = (
            select(CustomerAddress)
            .where(CustomerAddress.customer_id == customer_id)
            .order_by(CustomerAddress.is_default.desc(), CustomerAddress.id.desc())
        )
        return list(self.db.scalars(statement).all())

    def get(self, address_id: int) -> CustomerAddress | None:
        return self.db.get(CustomerAddress, address_id)

    def create(self, **fields) -> CustomerAddress:
        row = CustomerAddress(**fields)
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def save(self, row: CustomerAddress) -> CustomerAddress:
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def delete(self, row: CustomerAddress) -> None:
        self.db.delete(row)
        self.db.commit()

    def unset_default_for_user(self, user_id: int | None) -> None:
        statement = select(CustomerAddress).where(CustomerAddress.user_id == user_id)
        for row in self.db.scalars(statement).all():
            row.is_default = False
        self.db.commit()

    def unset_default_for_customer(self, customer_id: int) -> None:
        statement = select(CustomerAddress).where(
            CustomerAddress.customer_id == customer_id
        )
        for row in self.db.scalars(statement).all():
            row.is_default = False
        self.db.commit()
