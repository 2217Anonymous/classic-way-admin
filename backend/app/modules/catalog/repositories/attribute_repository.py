from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.catalog.models.attribute import AttributeDefinition


class AttributeRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self) -> list[AttributeDefinition]:
        statement = select(AttributeDefinition).order_by(
            AttributeDefinition.sort_order.asc(),
            AttributeDefinition.name.asc(),
        )
        return list(self.db.scalars(statement).all())

    def get(self, attribute_id: int) -> AttributeDefinition | None:
        return self.db.get(AttributeDefinition, attribute_id)

    def get_by_name(self, name: str) -> AttributeDefinition | None:
        return self.db.scalar(
            select(AttributeDefinition).where(AttributeDefinition.name == name)
        )

    def create(self, **fields) -> AttributeDefinition:
        row = AttributeDefinition(**fields)
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def save(self, row: AttributeDefinition) -> AttributeDefinition:
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def delete(self, row: AttributeDefinition) -> None:
        self.db.delete(row)
        self.db.commit()

    def rollback(self) -> None:
        self.db.rollback()
