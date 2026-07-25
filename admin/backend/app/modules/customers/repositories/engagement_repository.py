from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.modules.customers.models import CouponUsage, Review


class ReviewRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_all(
        self,
        *,
        approved_only: bool | None = None,
        product_id: int | None = None,
    ) -> list[Review]:
        statement = (
            select(Review)
            .options(selectinload(Review.images))
            .order_by(Review.created_at.desc())
        )
        if product_id is not None:
            statement = statement.where(Review.product_id == product_id)
        if approved_only is True:
            statement = statement.where(Review.is_approved.is_(True))
        elif approved_only is False:
            statement = statement.where(Review.is_approved.is_(False))
        return list(self.db.scalars(statement).unique().all())

    def get(self, review_id: int) -> Review | None:
        statement = (
            select(Review)
            .where(Review.id == review_id)
            .options(selectinload(Review.images))
        )
        return self.db.scalars(statement).unique().first()

    def save(self, review: Review) -> Review:
        self.db.add(review)
        self.db.commit()
        return self.get(review.id) or review

    def delete(self, review: Review) -> None:
        self.db.delete(review)
        self.db.commit()


class CouponUsageRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_all(
        self, *, coupon_id: int | None = None, customer_id: int | None = None
    ) -> list[CouponUsage]:
        statement = select(CouponUsage).order_by(CouponUsage.used_at.desc())
        if coupon_id is not None:
            statement = statement.where(CouponUsage.coupon_id == coupon_id)
        if customer_id is not None:
            statement = statement.where(CouponUsage.customer_id == customer_id)
        return list(self.db.scalars(statement).all())
