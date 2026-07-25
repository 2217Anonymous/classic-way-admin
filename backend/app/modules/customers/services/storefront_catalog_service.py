from __future__ import annotations

import math
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.modules.catalog.models.product import Product
from app.modules.catalog.repositories.brand_repository import BrandRepository
from app.modules.catalog.repositories.category_repository import CategoryRepository
from app.modules.catalog.repositories.product_repository import ProductRepository
from app.modules.catalog.schemas.brand import BrandResponse
from app.modules.catalog.schemas.category import CategoryResponse
from app.modules.catalog.schemas.product import ProductResponse, ProductVariantResponse
from app.modules.catalog.services.product_service import ProductService
from app.modules.customers.models import Customer
from app.modules.customers.repositories.engagement_repository import ReviewRepository
from app.modules.customers.schemas.commerce import ProductListResponse
from app.modules.customers.schemas.engagement import ReviewResponse
from app.modules.storefront.services import PUBLIC_VISIBILITY
from app.utils.exceptions import NotFoundError


class StorefrontCatalogService:
    def __init__(
        self,
        db: Session,
        product_repository: ProductRepository,
        category_repository: CategoryRepository,
        brand_repository: BrandRepository,
        review_repository: ReviewRepository | None = None,
    ):
        self.db = db
        self.product_repository = product_repository
        self.category_repository = category_repository
        self.brand_repository = brand_repository
        self.review_repository = review_repository or ReviewRepository(db)
        self._product_service = ProductService(
            product_repository, category_repository, brand_repository
        )

    def list_products(
        self,
        *,
        search: str | None = None,
        category: str | None = None,
        brand: str | None = None,
        size: str | None = None,
        color: str | None = None,
        min_price: Decimal | None = None,
        max_price: Decimal | None = None,
        rating: float | None = None,
        discount: Decimal | None = None,
        availability: str | None = None,
        sort: str | None = None,
        page: int = 1,
        limit: int = 20,
        featured: bool | None = None,
        trending: bool | None = None,
        best_seller: bool | None = None,
        new_arrivals: bool = False,
    ) -> ProductListResponse:
        page = max(page, 1)
        limit = min(max(limit, 1), 100)
        statement = select(Product).options(*self.product_repository._options()).where(
            Product.is_active.is_(True),
            Product.is_published.is_(True),
            Product.visibility == PUBLIC_VISIBILITY,
            Product.deleted_at.is_(None),
        )

        if search:
            term = f"%{search.strip()}%"
            statement = statement.where(
                or_(
                    Product.name.ilike(term),
                    Product.description.ilike(term),
                    Product.tags.ilike(term),
                    Product.sku.ilike(term),
                )
            )
        if category:
            cat = self.category_repository.get_by_slug(category)
            if cat:
                statement = statement.where(Product.category_id == cat.id)
            else:
                return ProductListResponse(
                    items=[], total=0, page=page, limit=limit, pages=0
                )
        if brand:
            brand_row = self.brand_repository.get_by_slug(brand)
            if brand_row:
                statement = statement.where(Product.brand_id == brand_row.id)
            else:
                return ProductListResponse(
                    items=[], total=0, page=page, limit=limit, pages=0
                )
        if min_price is not None:
            statement = statement.where(Product.price >= min_price)
        if max_price is not None:
            statement = statement.where(Product.price <= max_price)
        if discount is not None:
            statement = statement.where(Product.discount_percent >= discount)
        if availability == "in_stock":
            statement = statement.where(Product.stock > 0)
        elif availability == "out_of_stock":
            statement = statement.where(Product.stock <= 0)
        if featured:
            statement = statement.where(Product.is_featured.is_(True))
        if trending:
            statement = statement.where(Product.is_trending.is_(True))
        if best_seller:
            statement = statement.where(Product.is_best_seller.is_(True))
        if size or color:
            tags_parts = []
            if size:
                tags_parts.append(f"%{size}%")
            if color:
                tags_parts.append(f"%{color}%")
            for part in tags_parts:
                statement = statement.where(Product.tags.ilike(part))

        if new_arrivals or sort == "newest":
            statement = statement.order_by(Product.created_at.desc())
        elif sort == "price_asc":
            statement = statement.order_by(Product.price.asc())
        elif sort == "price_desc":
            statement = statement.order_by(Product.price.desc())
        elif sort == "name":
            statement = statement.order_by(Product.name.asc())
        else:
            statement = statement.order_by(Product.sort_order.asc(), Product.name.asc())

        count_stmt = select(func.count()).select_from(statement.subquery())
        total = int(self.db.scalar(count_stmt) or 0)
        pages = math.ceil(total / limit) if total else 0
        rows = list(
            self.db.scalars(statement.offset((page - 1) * limit).limit(limit))
            .unique()
            .all()
        )
        items = [self._product_service._to_response(p) for p in rows]
        if rating is not None:
            items = [p for p in items if self._avg_rating(p.id) >= rating]
            total = len(items)
            pages = math.ceil(total / limit) if total else 0
        return ProductListResponse(
            items=items, total=total, page=page, limit=limit, pages=pages
        )

    def get_product(self, product_id: UUID) -> ProductResponse:
        product = self.product_repository.get(product_id)
        if not product or not self._is_public(product):
            raise NotFoundError("Product not found")
        return self._product_service._to_response(product)

    def get_product_by_slug(self, slug: str) -> ProductResponse:
        product = self.product_repository.get_by_slug(slug)
        if not product or not self._is_public(product):
            raise NotFoundError("Product not found")
        return self._product_service._to_response(product)

    def related_products(self, product_id: UUID, limit: int = 8) -> list[ProductResponse]:
        product = self.product_repository.get(product_id)
        if not product or not self._is_public(product):
            raise NotFoundError("Product not found")
        statement = (
            select(Product)
            .options(*self.product_repository._options())
            .where(
                Product.id != product_id,
                Product.is_active.is_(True),
                Product.is_published.is_(True),
                Product.visibility == PUBLIC_VISIBILITY,
                Product.deleted_at.is_(None),
            )
            .order_by(Product.sort_order.asc())
            .limit(limit)
        )
        if product.category_id:
            statement = statement.where(Product.category_id == product.category_id)
        rows = list(self.db.scalars(statement).unique().all())
        return [self._product_service._to_response(p) for p in rows]

    def product_variants(self, product_id: UUID) -> list[ProductVariantResponse]:
        product = self.get_product(product_id)
        return product.variants

    def product_reviews(self, product_id: UUID) -> list[ReviewResponse]:
        self.get_product(product_id)
        reviews = self.review_repository.list_approved_for_product(product_id)
        return [self._review_response(r) for r in reviews]

    def suggestions(self, q: str, limit: int = 8) -> list[str]:
        if not q.strip():
            return []
        term = f"%{q.strip()}%"
        statement = (
            select(Product.name)
            .where(
                Product.is_active.is_(True),
                Product.is_published.is_(True),
                Product.visibility == PUBLIC_VISIBILITY,
                Product.name.ilike(term),
            )
            .order_by(Product.name.asc())
            .limit(limit)
        )
        return list(self.db.scalars(statement).all())

    def list_categories(self) -> list[CategoryResponse]:
        return [
            CategoryResponse.model_validate(c)
            for c in self.category_repository.list()
            if c.is_active
        ]

    def get_category(self, slug: str) -> CategoryResponse:
        category = self.category_repository.get_by_slug(slug)
        if not category or not category.is_active:
            raise NotFoundError("Category not found")
        return CategoryResponse.model_validate(category)

    def category_products(
        self, slug: str, page: int = 1, limit: int = 20
    ) -> ProductListResponse:
        return self.list_products(category=slug, page=page, limit=limit)

    def list_brands(self) -> list[BrandResponse]:
        return [
            BrandResponse.model_validate(b)
            for b in self.brand_repository.list()
            if b.is_active
        ]

    def _avg_rating(self, product_id: UUID) -> float:
        reviews = self.review_repository.list_approved_for_product(product_id)
        if not reviews:
            return 0.0
        return sum(r.rating for r in reviews) / len(reviews)

    def _review_response(self, review) -> ReviewResponse:
        customer = self.db.get(Customer, review.customer_id)
        data = ReviewResponse.model_validate(review)
        data.customer_name = customer.full_name if customer else None
        return data

    def _is_public(self, product: Product) -> bool:
        return (
            product.is_active
            and product.is_published
            and product.visibility == PUBLIC_VISIBILITY
            and getattr(product, "deleted_at", None) is None
        )
