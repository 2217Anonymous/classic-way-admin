from uuid import UUID
from fastapi import APIRouter, status

from app.modules.catalog.repositories.product_repository import ProductRepository
from app.modules.customers.api.dependencies import CurrentCustomer, OptionalCustomer, DbSession
from app.modules.customers.repositories.engagement_repository import (
    CompareRepository,
    FeedbackRepository,
    ReviewRepository,
    WishlistRepository,
)
from app.modules.customers.schemas.engagement import (
    CompareItemCreate,
    CompareResponse,
    FeedbackCreate,
    FeedbackResponse,
    ReviewCreate,
    ReviewResponse,
    WishlistItemCreate,
    WishlistResponse,
)
from app.modules.customers.services.engagement_service import EngagementService
from app.modules.orders.repositories.order_repository import OrderRepository

wishlist_router = APIRouter(prefix="/wishlist", tags=["Wishlist"])
compare_router = APIRouter(prefix="/compare", tags=["Compare"])
reviews_router = APIRouter(prefix="/reviews", tags=["Reviews"])
feedback_router = APIRouter(prefix="/feedback", tags=["Feedback"])


def get_service(db: DbSession) -> EngagementService:
    return EngagementService(
        WishlistRepository(db),
        CompareRepository(db),
        ReviewRepository(db),
        ProductRepository(db),
        OrderRepository(db),
        FeedbackRepository(db),
    )


@wishlist_router.get("", response_model=WishlistResponse)
def get_wishlist(customer: CurrentCustomer, db: DbSession) -> WishlistResponse:
    return get_service(db).get_wishlist(customer)


@wishlist_router.post("/items", response_model=WishlistResponse)
def add_wishlist_item(
    payload: WishlistItemCreate, customer: CurrentCustomer, db: DbSession
) -> WishlistResponse:
    return get_service(db).add_wishlist_item(customer, payload)


@wishlist_router.delete("/items/{item_id}", response_model=WishlistResponse)
def remove_wishlist_item(
    item_id: UUID, customer: CurrentCustomer, db: DbSession
) -> WishlistResponse:
    return get_service(db).remove_wishlist_item(customer, item_id)


@compare_router.get("", response_model=CompareResponse)
def get_compare(customer: CurrentCustomer, db: DbSession) -> CompareResponse:
    return get_service(db).get_compare(customer)


@compare_router.post("/items", response_model=CompareResponse)
def add_compare_item(
    payload: CompareItemCreate, customer: CurrentCustomer, db: DbSession
) -> CompareResponse:
    return get_service(db).add_compare_item(customer, payload)


@compare_router.delete("/items/{item_id}", response_model=CompareResponse)
def remove_compare_item(
    item_id: UUID, customer: CurrentCustomer, db: DbSession
) -> CompareResponse:
    return get_service(db).remove_compare_item(customer, item_id)


@reviews_router.post("", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
def create_review(
    payload: ReviewCreate, customer: CurrentCustomer, db: DbSession
) -> ReviewResponse:
    return get_service(db).create_review(customer, payload)


@feedback_router.post("", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
def submit_feedback(
    payload: FeedbackCreate,
    db: DbSession,
    customer: OptionalCustomer,
) -> FeedbackResponse:
    return get_service(db).submit_feedback(payload, customer)
