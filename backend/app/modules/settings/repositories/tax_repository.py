from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.settings.models.tax import TaxRule


class TaxRuleRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self) -> list[TaxRule]:
        statement = select(TaxRule).order_by(
            TaxRule.sort_order.asc(), TaxRule.name.asc()
        )
        return list(self.db.scalars(statement).all())

    def list_active(self) -> list[TaxRule]:
        statement = (
            select(TaxRule)
            .where(TaxRule.is_active.is_(True))
            .order_by(TaxRule.sort_order.asc(), TaxRule.name.asc())
        )
        return list(self.db.scalars(statement).all())

    def get(self, tax_id: UUID) -> TaxRule | None:
        return self.db.get(TaxRule, tax_id)

    def get_by_code(self, code: str) -> TaxRule | None:
        return self.db.scalar(select(TaxRule).where(TaxRule.code == code))

    def create(self, **fields) -> TaxRule:
        row = TaxRule(**fields)
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def save(self, row: TaxRule) -> TaxRule:
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def delete(self, row: TaxRule) -> None:
        self.db.delete(row)
        self.db.commit()

    def rollback(self) -> None:
        self.db.rollback()
