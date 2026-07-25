from __future__ import annotations

from uuid import UUID
from app.modules.catalog.repositories.product_repository import ProductRepository
from app.modules.customers.models import Customer
from app.modules.customers.repositories.engagement_repository import (
    CompareRepository,
    FeedbackRepository,
    ReviewRepository,
    WishlistRepository,
)
from app.modules.customers.schemas.engagement import (
    CompareItemCreate,
    CompareItemResponse,
    CompareResponse,
    FeedbackCreate,
    FeedbackResponse,
    ReviewCreate,
    ReviewResponse,
    WishlistItemCreate,
    WishlistItemResponse,
    WishlistResponse,
)
from app.modules.orders.repositories.order_repository import OrderRepository
from app.utils.exceptions import AppError, ConflictError, NotFoundError


class EngagementService:
    def __init__(
        self,
        wishlist_repository: WishlistRepository,
        compare_repository: CompareRepository,
        review_repository: ReviewRepository,
        product_repository: ProductRepository,
        order_repository: OrderRepository | None = None,
        feedback_repository: FeedbackRepository | None = None,
    ):
        self.wishlist_repository = wishlist_repository
        self.compare_repository = compare_repository
        self.review_repository = review_repository
        self.product_repository = product_repository
        self.order_repository = order_repository
        self.feedback_repository = feedback_repository

    def get_wishlist(self, customer: Customer) -> WishlistResponse:
        wishlist = self.wishlist_repository.get_or_create(customer.id)
        return self._wishlist_response(wishlist)

    def add_wishlist_item(
        self, customer: Customer, payload: WishlistItemCreate
    ) -> WishlistResponse:
        product = self.product_repository.get(payload.product_id)
        if not product or not product.is_active:
            raise NotFoundError("Product not found")
        wishlist = self.wishlist_repository.get_or_create(customer.id)
        if any(item.product_id == payload.product_id for item in wishlist.items):
            return self._wishlist_response(wishlist)
        self.wishlist_repository.add_item(wishlist.id, payload.product_id)
        return self._wishlist_response(
            self.wishlist_repository.get(wishlist.id) or wishlist
        )

    def remove_wishlist_item(self, customer: Customer, item_id: UUID) -> WishlistResponse:
        wishlist = self.wishlist_repository.get_or_create(customer.id)
        item = self.wishlist_repository.get_item(item_id)
        if not item or item.wishlist_id != wishlist.id:
            raise NotFoundError("Wishlist item not found")
        self.wishlist_repository.delete_item(item)
        return self._wishlist_response(
            self.wishlist_repository.get(wishlist.id) or wishlist
        )

    def get_compare(self, customer: Customer) -> CompareResponse:
        compare = self.compare_repository.get_or_create(customer.id)
        return self._compare_response(compare)

    def add_compare_item(
        self, customer: Customer, payload: CompareItemCreate
    ) -> CompareResponse:
        product = self.product_repository.get(payload.product_id)
        if not product or not product.is_active:
            raise NotFoundError("Product not found")
        compare = self.compare_repository.get_or_create(customer.id)
        if len(compare.items) >= 4:
            raise AppError("Compare list is limited to 4 products", 400)
        if any(item.product_id == payload.product_id for item in compare.items):
            return self._compare_response(compare)
        self.compare_repository.add_item(compare.id, payload.product_id)
        return self._compare_response(self.compare_repository.get(compare.id) or compare)

    def remove_compare_item(self, customer: Customer, item_id: UUID) -> CompareResponse:
        compare = self.compare_repository.get_or_create(customer.id)
        item = self.compare_repository.get_item(item_id)
        if not item or item.compare_list_id != compare.id:
            raise NotFoundError("Compare item not found")
        self.compare_repository.delete_item(item)
        return self._compare_response(self.compare_repository.get(compare.id) or compare)

    def create_review(
        self, customer: Customer, payload: ReviewCreate
    ) -> ReviewResponse:
        product = self.product_repository.get(payload.product_id)
        if not product or not product.is_active:
            raise NotFoundError("Product not found")
        existing = self.review_repository.get_by_customer_product(
            customer.id, payload.product_id
        )
        if existing:
            raise ConflictError("You have already reviewed this product")

        verified = False
        if self.order_repository:
            orders = self.order_repository.list_for_customer(customer.id)
            verified = any(
                any(item.product_id == payload.product_id for item in order.items)
                for order in orders
                if order.status in {"paid", "shipped", "delivered", "completed"}
            )

        review = self.review_repository.create(
            product_id=payload.product_id,
            customer_id=customer.id,
            rating=payload.rating,
            title=payload.title,
            body=payload.body,
            is_verified_purchase=verified,
        )
        data = ReviewResponse.model_validate(review)
        data.customer_name = customer.full_name
        return data

    def submit_feedback(
        self,
        payload: FeedbackCreate,
        customer: Customer | None = None,
    ) -> FeedbackResponse:
        if not self.feedback_repository:
            raise AppError("Feedback is unavailable", 503)
        row = self.feedback_repository.create(
            customer_id=customer.id if customer else None,
            name=payload.name.strip(),
            email=str(payload.email).strip().lower(),
            subject=payload.subject.strip(),
            message=payload.message.strip(),
            status="new",
        )
        return FeedbackResponse.model_validate(row)

    def _wishlist_response(self, wishlist) -> WishlistResponse:
        items: list[WishlistItemResponse] = []
        for item in wishlist.items:
            product = self.product_repository.get(item.product_id)
            primary = None
            if product and product.media:
                primary_media = next(
                    (m for m in product.media if m.is_primary), product.media[0]
                )
                primary = primary_media.url
            items.append(
                WishlistItemResponse(
                    id=item.id,
                    product_id=item.product_id,
                    product_name=product.name if product else None,
                    product_slug=product.slug if product else None,
                    product_price=product.price if product else None,
                    product_image=primary,
                )
            )
        return WishlistResponse(
            id=wishlist.id,
            customer_id=wishlist.customer_id,
            items=items,
            item_count=len(items),
        )

    def _compare_response(self, compare) -> CompareResponse:
        items: list[CompareItemResponse] = []
        for item in compare.items:
            product = self.product_repository.get(item.product_id)
            primary = None
            if product and product.media:
                primary_media = next(
                    (m for m in product.media if m.is_primary), product.media[0]
                )
                primary = primary_media.url
            items.append(
                CompareItemResponse(
                    id=item.id,
                    product_id=item.product_id,
                    product_name=product.name if product else None,
                    product_slug=product.slug if product else None,
                    product_price=product.price if product else None,
                    product_image=primary,
                )
            )
        return CompareResponse(
            id=compare.id,
            customer_id=compare.customer_id,
            items=items,
            item_count=len(items),
        )
