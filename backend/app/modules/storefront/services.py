from __future__ import annotations

from app.modules.catalog.repositories.category_repository import CategoryRepository
from app.modules.catalog.repositories.product_repository import ProductRepository
from app.modules.catalog.schemas.product import ProductResponse
from app.modules.catalog.services.product_service import ProductService
from app.utils.exceptions import NotFoundError

PUBLIC_VISIBILITY = "public"


class StorefrontService:
    """VL-014 — read-only public catalog surface for the shopfront."""

    def __init__(
        self,
        product_repository: ProductRepository,
        category_repository: CategoryRepository,
    ):
        self.product_repository = product_repository
        # Reuse catalog's response-building logic instead of duplicating it.
        self._product_service = ProductService(product_repository, category_repository)

    def list_products(self) -> list[ProductResponse]:
        return [
            self._product_service._to_response(product)
            for product in self.product_repository.list()
            if self._is_public(product)
        ]

    def get_product(self, slug: str) -> ProductResponse:
        product = self.product_repository.get_by_slug(slug)
        if not product or not self._is_public(product):
            raise NotFoundError("Product not found")
        return self._product_service._to_response(product)

    def _is_public(self, product) -> bool:
        return (
            product.is_active
            and product.is_published
            and product.visibility == PUBLIC_VISIBILITY
        )
