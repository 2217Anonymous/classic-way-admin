from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.settings.models.coupon import Coupon


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
