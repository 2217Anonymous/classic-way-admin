from __future__ import annotations

from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.settings.models import Coupon, StoreSettings, TaxRule


class StoreSettingsRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_singleton(self) -> StoreSettings | None:
        return self.db.scalar(select(StoreSettings).order_by(StoreSettings.id.asc()))

    def create(self, **fields) -> StoreSettings:
        row = StoreSettings(**fields)
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def save(self, row: StoreSettings) -> StoreSettings:
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row


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


class CouponRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self) -> list[Coupon]:
        statement = select(Coupon).order_by(Coupon.created_at.desc())
        return list(self.db.scalars(statement).all())

    def get(self, coupon_id: UUID) -> Coupon | None:
        return self.db.get(Coupon, coupon_id)

    def get_by_code(self, code: str) -> Coupon | None:
        return self.db.scalar(select(Coupon).where(Coupon.code == code))

    def create(self, **fields) -> Coupon:
        row = Coupon(**fields)
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def save(self, row: Coupon) -> Coupon:
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def delete(self, row: Coupon) -> None:
        self.db.delete(row)
        self.db.commit()

    def rollback(self) -> None:
        self.db.rollback()
