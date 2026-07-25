from __future__ import annotations

from uuid import UUID
from pydantic import BaseModel

from app.modules.customers.repositories.customer_repository import CustomerRepository
from app.modules.customers.repositories.engagement_repository import ReviewRepository
from app.modules.customers.schemas.engagement import (
    ReviewImageResponse,
    ReviewResponse,
)
from app.utils.exceptions import NotFoundError


class ReviewModerationUpdate(BaseModel):
    is_approved: bool


class AdminReviewService:
    def __init__(
        self,
        repository: ReviewRepository,
        customer_repository: CustomerRepository | None = None,
    ):
        self.repository = repository
        self.customer_repository = customer_repository

    def list_reviews(
        self,
        *,
        approved: bool | None = None,
        product_id: UUID | None = None,
    ) -> list[ReviewResponse]:
        return [
            self._to_response(review)
            for review in self.repository.list_all(
                approved_only=approved, product_id=product_id
            )
        ]

    def moderate(
        self, review_id: UUID, payload: ReviewModerationUpdate
    ) -> ReviewResponse:
        review = self._get_or_404(review_id)
        review.is_approved = payload.is_approved
        return self._to_response(self.repository.save(review))

    def delete(self, review_id: UUID) -> None:
        review = self._get_or_404(review_id)
        self.repository.delete(review)

    def _get_or_404(self, review_id: UUID):
        review = self.repository.get(review_id)
        if not review:
            raise NotFoundError("Review not found")
        return review

    def _to_response(self, review) -> ReviewResponse:
        customer_name = None
        if self.customer_repository:
            customer = self.customer_repository.get(review.customer_id)
            customer_name = customer.full_name if customer else None
        return ReviewResponse(
            id=review.id,
            product_id=review.product_id,
            customer_id=review.customer_id,
            customer_name=customer_name,
            rating=review.rating,
            title=review.title,
            body=review.body,
            is_verified_purchase=review.is_verified_purchase,
            is_approved=review.is_approved,
            images=[
                ReviewImageResponse.model_validate(img) for img in review.images
            ],
            created_at=review.created_at,
            updated_at=review.updated_at,
        )
