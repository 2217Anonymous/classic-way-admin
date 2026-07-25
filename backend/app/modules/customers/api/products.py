from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Query

from app.modules.catalog.repositories.brand_repository import BrandRepository
from app.modules.catalog.repositories.category_repository import CategoryRepository
from app.modules.catalog.repositories.product_repository import ProductRepository
from app.modules.catalog.schemas.brand import BrandResponse
from app.modules.catalog.schemas.category import CategoryResponse
from app.modules.catalog.schemas.product import ProductResponse, ProductVariantResponse
from app.modules.customers.api.dependencies import DbSession
from app.modules.customers.repositories.engagement_repository import ReviewRepository
from app.modules.customers.schemas.commerce import ProductListResponse
from app.modules.customers.schemas.engagement import ReviewResponse
from app.modules.customers.services.storefront_catalog_service import (
    StorefrontCatalogService,
)

router = APIRouter(prefix="/products", tags=["Storefront Products"])
categories_router = APIRouter(prefix="/categories", tags=["Storefront Categories"])
brands_router = APIRouter(prefix="/brands", tags=["Storefront Brands"])


def get_service(db: DbSession) -> StorefrontCatalogService:
    return StorefrontCatalogService(
        db,
        ProductRepository(db),
        CategoryRepository(db),
        BrandRepository(db),
        ReviewRepository(db),
    )


@router.get("", response_model=ProductListResponse)
def list_products(
    db: DbSession,
    search: str | None = Query(default=None),
    category: str | None = Query(default=None),
    brand: str | None = Query(default=None),
    size: str | None = Query(default=None),
    color: str | None = Query(default=None),
    min_price: Decimal | None = Query(default=None),
    max_price: Decimal | None = Query(default=None),
    rating: float | None = Query(default=None),
    discount: Decimal | None = Query(default=None),
    availability: str | None = Query(default=None),
    sort: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
) -> ProductListResponse:
    return get_service(db).list_products(
        search=search,
        category=category,
        brand=brand,
        size=size,
        color=color,
        min_price=min_price,
        max_price=max_price,
        rating=rating,
        discount=discount,
        availability=availability,
        sort=sort,
        page=page,
        limit=limit,
    )


@router.get("/featured", response_model=ProductListResponse)
def featured(
    db: DbSession, limit: int = Query(default=20, ge=1, le=100)
) -> ProductListResponse:
    return get_service(db).list_products(featured=True, limit=limit)


@router.get("/trending", response_model=ProductListResponse)
def trending(
    db: DbSession, limit: int = Query(default=20, ge=1, le=100)
) -> ProductListResponse:
    return get_service(db).list_products(trending=True, limit=limit)


@router.get("/best-sellers", response_model=ProductListResponse)
def best_sellers(
    db: DbSession, limit: int = Query(default=20, ge=1, le=100)
) -> ProductListResponse:
    return get_service(db).list_products(best_seller=True, limit=limit)


@router.get("/new-arrivals", response_model=ProductListResponse)
def new_arrivals(
    db: DbSession, limit: int = Query(default=20, ge=1, le=100)
) -> ProductListResponse:
    return get_service(db).list_products(new_arrivals=True, limit=limit)


@router.get("/search", response_model=ProductListResponse)
def search_products(
    db: DbSession,
    q: str = Query(default=""),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
) -> ProductListResponse:
    return get_service(db).list_products(search=q, page=page, limit=limit)


@router.get("/suggestions", response_model=list[str])
def suggestions(
    db: DbSession,
    q: str = Query(default=""),
    limit: int = Query(default=8, ge=1, le=20),
) -> list[str]:
    return get_service(db).suggestions(q, limit=limit)


@router.get("/slug/{slug}", response_model=ProductResponse)
def get_by_slug(slug: str, db: DbSession) -> ProductResponse:
    return get_service(db).get_product_by_slug(slug)


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: UUID, db: DbSession) -> ProductResponse:
    return get_service(db).get_product(product_id)


@router.get("/{product_id}/related", response_model=list[ProductResponse])
def related(product_id: UUID, db: DbSession) -> list[ProductResponse]:
    return get_service(db).related_products(product_id)


@router.get("/{product_id}/reviews", response_model=list[ReviewResponse])
def reviews(product_id: UUID, db: DbSession) -> list[ReviewResponse]:
    return get_service(db).product_reviews(product_id)


@router.get("/{product_id}/variants", response_model=list[ProductVariantResponse])
def variants(product_id: UUID, db: DbSession) -> list[ProductVariantResponse]:
    return get_service(db).product_variants(product_id)


@categories_router.get("", response_model=list[CategoryResponse])
def list_categories(db: DbSession) -> list[CategoryResponse]:
    return get_service(db).list_categories()


@categories_router.get("/{slug}", response_model=CategoryResponse)
def get_category(slug: str, db: DbSession) -> CategoryResponse:
    return get_service(db).get_category(slug)


@categories_router.get("/{slug}/products", response_model=ProductListResponse)
def category_products(
    slug: str,
    db: DbSession,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
) -> ProductListResponse:
    return get_service(db).category_products(slug, page=page, limit=limit)


@brands_router.get("", response_model=list[BrandResponse])
def list_brands(db: DbSession) -> list[BrandResponse]:
    return get_service(db).list_brands()
