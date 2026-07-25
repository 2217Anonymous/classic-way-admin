from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status

from app.modules.customers.repositories.customer_repository import CustomerRepository
from app.modules.customers.repositories.engagement_repository import ReviewRepository
from app.modules.customers.schemas.engagement import ReviewResponse
from app.modules.customers.services.admin_review_service import (
    AdminReviewService,
    ReviewModerationUpdate,
)
from app.modules.iam.api.dependencies import AdminUser, require_roles
from app.modules.iam.constants import MANAGER_ROLE, VIEWER_ROLE
from app.modules.identity.api.dependencies import DbSession
from app.modules.identity.models.user import User

router = APIRouter(prefix="/admin/reviews", tags=["Admin Reviews"])


def get_service(db: DbSession) -> AdminReviewService:
    return AdminReviewService(ReviewRepository(db), CustomerRepository(db))


@router.get("", response_model=list[ReviewResponse])
def list_reviews(
    db: DbSession,
    _: Annotated[User, Depends(require_roles(MANAGER_ROLE, VIEWER_ROLE))],
    approved: bool | None = Query(default=None),
    product_id: UUID | None = Query(default=None),
) -> list[ReviewResponse]:
    return get_service(db).list_reviews(approved=approved, product_id=product_id)


@router.patch("/{review_id}", response_model=ReviewResponse)
def moderate_review(
    review_id: UUID,
    payload: ReviewModerationUpdate,
    db: DbSession,
    _: AdminUser,
) -> ReviewResponse:
    return get_service(db).moderate(review_id, payload)


@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_review(review_id: UUID, db: DbSession, _: AdminUser) -> Response:
    get_service(db).delete(review_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
