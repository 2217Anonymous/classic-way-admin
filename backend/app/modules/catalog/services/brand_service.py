from __future__ import annotations

import re
from uuid import UUID

from sqlalchemy.exc import IntegrityError

from app.modules.catalog.models.brand import Brand
from app.modules.catalog.repositories.brand_repository import BrandRepository
from app.modules.catalog.schemas.brand import BrandCreate, BrandUpdate
from app.utils.exceptions import ConflictError, NotFoundError


def slugify(value: str) -> str:
    slug = value.strip().lower()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    slug = re.sub(r"-{2,}", "-", slug).strip("-")
    return slug[:140] or "brand"


class BrandService:
    def __init__(self, repository: BrandRepository):
        self.repository = repository

    def list_brands(self) -> list[Brand]:
        return self.repository.list()

    def get_brand(self, brand_id: UUID) -> Brand:
        brand = self.repository.get(brand_id)
        if not brand:
            raise NotFoundError("Brand not found")
        return brand

    def create_brand(self, payload: BrandCreate) -> Brand:
        slug = slugify(payload.slug or payload.name)
        if self.repository.get_by_slug(slug):
            raise ConflictError("A brand with this slug already exists")
        try:
            return self.repository.create(
                name=payload.name.strip(),
                slug=slug,
                is_active=payload.is_active,
            )
        except IntegrityError as exc:
            self.repository.rollback()
            raise ConflictError("A brand with this slug already exists") from exc

    def update_brand(self, brand_id: UUID, payload: BrandUpdate) -> Brand:
        brand = self.get_brand(brand_id)
        changes = payload.model_dump(exclude_unset=True)

        if "name" in changes and changes["name"] is not None:
            brand.name = changes["name"].strip()
        if "is_active" in changes and changes["is_active"] is not None:
            brand.is_active = changes["is_active"]
        if "slug" in changes and changes["slug"] is not None:
            slug = slugify(changes["slug"])
            existing = self.repository.get_by_slug(slug)
            if existing and existing.id != brand.id:
                raise ConflictError("A brand with this slug already exists")
            brand.slug = slug

        try:
            return self.repository.save(brand)
        except IntegrityError as exc:
            self.repository.rollback()
            raise ConflictError("A brand with this slug already exists") from exc

    def delete_brand(self, brand_id: UUID) -> Brand | None:
        """Soft-deactivate when products reference the brand; hard-delete if unused."""
        brand = self.get_brand(brand_id)
        if self.repository.count_products(brand_id) > 0:
            brand.is_active = False
            return self.repository.save(brand)
        self.repository.delete(brand)
        return None
