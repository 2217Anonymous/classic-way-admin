from __future__ import annotations

from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.modules.customers.models import (
    CompareItem,
    CompareList,
    CouponUsage,
    Feedback,
    Review,
    Wishlist,
    WishlistItem,
)


class ReviewRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_all(
        self,
        *,
        approved_only: bool | None = None,
        product_id: UUID | None = None,
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

    def list_approved_for_product(self, product_id: UUID) -> list[Review]:
        return self.list_all(approved_only=True, product_id=product_id)

    def get(self, review_id: UUID) -> Review | None:
        statement = (
            select(Review)
            .where(Review.id == review_id)
            .options(selectinload(Review.images))
        )
        return self.db.scalars(statement).unique().first()

    def get_by_customer_product(
        self, customer_id: UUID, product_id: UUID
    ) -> Review | None:
        statement = select(Review).where(
            Review.customer_id == customer_id,
            Review.product_id == product_id,
        )
        return self.db.scalars(statement).first()

    def create(
        self,
        *,
        product_id: UUID,
        customer_id: UUID,
        rating: int,
        title: str | None = None,
        body: str | None = None,
        is_verified_purchase: bool = False,
    ) -> Review:
        review = Review(
            product_id=product_id,
            customer_id=customer_id,
            rating=rating,
            title=title,
            body=body,
            is_verified_purchase=is_verified_purchase,
            is_approved=False,
        )
        return self.save(review)

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
        self, *, coupon_id: UUID | None = None, customer_id: UUID | None = None
    ) -> list[CouponUsage]:
        statement = select(CouponUsage).order_by(CouponUsage.used_at.desc())
        if coupon_id is not None:
            statement = statement.where(CouponUsage.coupon_id == coupon_id)
        if customer_id is not None:
            statement = statement.where(CouponUsage.customer_id == customer_id)
        return list(self.db.scalars(statement).all())

    def create(self, **fields) -> CouponUsage:
        row = CouponUsage(**fields)
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row


class WishlistRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_or_create(self, customer_id: UUID) -> Wishlist:
        statement = (
            select(Wishlist)
            .where(Wishlist.customer_id == customer_id)
            .options(selectinload(Wishlist.items))
        )
        wishlist = self.db.scalars(statement).unique().first()
        if wishlist:
            return wishlist
        wishlist = Wishlist(customer_id=customer_id)
        self.db.add(wishlist)
        self.db.commit()
        self.db.refresh(wishlist)
        return self.get(wishlist.id) or wishlist

    def get(self, wishlist_id: UUID) -> Wishlist | None:
        statement = (
            select(Wishlist)
            .where(Wishlist.id == wishlist_id)
            .options(selectinload(Wishlist.items))
        )
        return self.db.scalars(statement).unique().first()

    def add_item(self, wishlist_id: UUID, product_id: UUID) -> WishlistItem:
        item = WishlistItem(wishlist_id=wishlist_id, product_id=product_id)
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def get_item(self, item_id: UUID) -> WishlistItem | None:
        return self.db.get(WishlistItem, item_id)

    def delete_item(self, item: WishlistItem) -> None:
        self.db.delete(item)
        self.db.commit()


class CompareRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_or_create(self, customer_id: UUID) -> CompareList:
        statement = (
            select(CompareList)
            .where(CompareList.customer_id == customer_id)
            .options(selectinload(CompareList.items))
        )
        row = self.db.scalars(statement).unique().first()
        if row:
            return row
        row = CompareList(customer_id=customer_id)
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return self.get(row.id) or row

    def get(self, compare_list_id: UUID) -> CompareList | None:
        statement = (
            select(CompareList)
            .where(CompareList.id == compare_list_id)
            .options(selectinload(CompareList.items))
        )
        return self.db.scalars(statement).unique().first()

    def add_item(self, compare_list_id: UUID, product_id: UUID) -> CompareItem:
        item = CompareItem(compare_list_id=compare_list_id, product_id=product_id)
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def get_item(self, item_id: UUID) -> CompareItem | None:
        return self.db.get(CompareItem, item_id)

    def delete_item(self, item: CompareItem) -> None:
        self.db.delete(item)
        self.db.commit()


class FeedbackRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, **fields) -> Feedback:
        row = Feedback(**fields)
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def list_all(self) -> list[Feedback]:
        statement = select(Feedback).order_by(Feedback.created_at.desc())
        return list(self.db.scalars(statement).all())
