from __future__ import annotations

import logging
import re
import uuid
from decimal import Decimal
from pathlib import Path
from uuid import UUID

from fastapi import UploadFile
from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.core.images.processing import process_uploaded_image
from app.core.storage import get_storage_provider
from app.core.storage.base import StorageProvider
from app.modules.catalog.models.product import (
    Product,
    ProductAttribute,
    ProductMedia,
    ProductVariant,
)
from app.modules.catalog.repositories.brand_repository import BrandRepository
from app.modules.catalog.repositories.category_repository import CategoryRepository
from app.modules.catalog.repositories.product_repository import ProductRepository
from app.modules.catalog.schemas.product import (
    ProductAttributeInput,
    ProductAttributeResponse,
    ProductCreate,
    ProductMediaResponse,
    ProductResponse,
    ProductUpdate,
    ProductVariantInput,
    ProductVariantResponse,
)
from app.utils.exceptions import AppError, ConflictError, NotFoundError

logger = logging.getLogger(__name__)

UPLOAD_ROOT = Path(settings.local_upload_root)
PRODUCT_UPLOAD_DIR = UPLOAD_ROOT / "products"
ALLOWED_VISIBILITY = {"public", "catalog", "hidden"}


def slugify(value: str) -> str:
    slug = value.strip().lower()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    slug = re.sub(r"-{2,}", "-", slug).strip("-")
    return slug[:170] or "product"


def product_media_variant_keys(product_id: UUID, media_id: UUID) -> dict[str, str]:
    base = f"products/{product_id}/{media_id}"
    return {
        "large": f"{base}/large.webp",
        "medium": f"{base}/medium.webp",
        "thumbnail": f"{base}/thumbnail.webp",
    }


def temp_original_key(upload_id: UUID) -> str:
    return f"temp/product-media/{upload_id}/original"


class ProductService:
    def __init__(
        self,
        repository: ProductRepository,
        category_repository: CategoryRepository,
        brand_repository: BrandRepository | None = None,
        storage: StorageProvider | None = None,
    ):
        self.repository = repository
        self.category_repository = category_repository
        self.brand_repository = brand_repository
        self.storage = storage or get_storage_provider()

    def list_products(self) -> list[ProductResponse]:
        return [self._to_response(product) for product in self.repository.list()]

    def get_product(self, product_id: UUID) -> ProductResponse:
        product = self.repository.get(product_id)
        if not product:
            raise NotFoundError("Product not found")
        return self._to_response(product)

    def create_product(self, payload: ProductCreate) -> ProductResponse:
        slug = slugify(payload.slug or payload.name)
        self._ensure_unique_slug(slug)
        sku = payload.sku.strip() if payload.sku else None
        if sku:
            self._ensure_unique_sku(sku)
        self._validate_category(payload.category_id)
        self._validate_brand(payload.brand_id)
        self._validate_prices(payload.price, payload.compare_at_price)
        visibility = self._normalize_visibility(payload.visibility)
        self._validate_attributes(payload.attributes)
        self._validate_variants(payload.variants)

        try:
            product = self.repository.create(
                name=payload.name.strip(),
                slug=slug,
                description=self._clean_text(payload.description),
                short_description=self._clean_text(payload.short_description),
                price=payload.price,
                compare_at_price=payload.compare_at_price,
                discount_percent=payload.discount_percent,
                sku=sku,
                manufacturer_name=self._clean_text(payload.manufacturer_name),
                manufacturer_brand=self._clean_text(payload.manufacturer_brand),
                stock=payload.stock,
                tags=self._clean_text(payload.tags),
                visibility=visibility,
                published_at=payload.published_at,
                category_id=payload.category_id,
                brand_id=payload.brand_id,
                is_published=payload.is_published,
                is_active=payload.is_active,
                is_featured=payload.is_featured,
                is_trending=payload.is_trending,
                is_best_seller=payload.is_best_seller,
                exchangeable=payload.exchangeable,
                refundable=payload.refundable,
                sort_order=payload.sort_order,
            )
            product = self._sync_attributes(product, payload.attributes)
            product = self._sync_variants(product, payload.variants)
            return self._to_response(product)
        except IntegrityError as exc:
            self.repository.rollback()
            raise ConflictError("Product slug, SKU, or variant SKU already exists") from exc

    def update_product(
        self, product_id: UUID, payload: ProductUpdate
    ) -> ProductResponse:
        product = self.repository.get(product_id)
        if not product:
            raise NotFoundError("Product not found")

        changes = payload.model_dump(exclude_unset=True)
        attributes = changes.pop("attributes", None)
        variants = changes.pop("variants", None)

        if "name" in changes and changes["name"] is not None:
            product.name = changes["name"].strip()
        if "description" in changes:
            product.description = self._clean_text(changes["description"])
        if "short_description" in changes:
            product.short_description = self._clean_text(changes["short_description"])
        if "price" in changes and changes["price"] is not None:
            product.price = changes["price"]
        if "compare_at_price" in changes:
            product.compare_at_price = changes["compare_at_price"]
        if "discount_percent" in changes:
            product.discount_percent = changes["discount_percent"]
        if "manufacturer_name" in changes:
            product.manufacturer_name = self._clean_text(changes["manufacturer_name"])
        if "manufacturer_brand" in changes:
            product.manufacturer_brand = self._clean_text(changes["manufacturer_brand"])
        if "stock" in changes and changes["stock"] is not None:
            product.stock = changes["stock"]
        if "tags" in changes:
            product.tags = self._clean_text(changes["tags"])
        if "visibility" in changes and changes["visibility"] is not None:
            product.visibility = self._normalize_visibility(changes["visibility"])
        if "published_at" in changes:
            product.published_at = changes["published_at"]
        if "is_published" in changes and changes["is_published"] is not None:
            product.is_published = changes["is_published"]
        if "is_active" in changes and changes["is_active"] is not None:
            product.is_active = changes["is_active"]
        if "is_featured" in changes and changes["is_featured"] is not None:
            product.is_featured = changes["is_featured"]
        if "is_trending" in changes and changes["is_trending"] is not None:
            product.is_trending = changes["is_trending"]
        if "is_best_seller" in changes and changes["is_best_seller"] is not None:
            product.is_best_seller = changes["is_best_seller"]
        if "exchangeable" in changes and changes["exchangeable"] is not None:
            product.exchangeable = changes["exchangeable"]
        if "refundable" in changes and changes["refundable"] is not None:
            product.refundable = changes["refundable"]
        if "sort_order" in changes and changes["sort_order"] is not None:
            product.sort_order = changes["sort_order"]
        if "slug" in changes and changes["slug"] is not None:
            slug = slugify(changes["slug"])
            self._ensure_unique_slug(slug, exclude_id=product.id)
            product.slug = slug
        if "sku" in changes:
            sku = changes["sku"].strip() if changes["sku"] else None
            if sku:
                self._ensure_unique_sku(sku, exclude_id=product.id)
            product.sku = sku
        if "category_id" in changes:
            self._validate_category(changes["category_id"])
            product.category_id = changes["category_id"]
        if "brand_id" in changes:
            self._validate_brand(changes["brand_id"])
            product.brand_id = changes["brand_id"]

        self._validate_prices(product.price, product.compare_at_price)

        try:
            saved = self.repository.save(product)
            if attributes is not None:
                attr_models = [
                    ProductAttributeInput.model_validate(item) for item in attributes
                ]
                self._validate_attributes(attr_models)
                saved = self._sync_attributes(saved, attr_models)
            if variants is not None:
                variant_models = [
                    ProductVariantInput.model_validate(item) for item in variants
                ]
                self._validate_variants(variant_models, exclude_product_id=product.id)
                saved = self._sync_variants(saved, variant_models)
            return self._to_response(saved)
        except IntegrityError as exc:
            self.repository.rollback()
            raise ConflictError("Product slug, SKU, or variant SKU already exists") from exc

    def delete_product(self, product_id: UUID) -> None:
        product = self.repository.get(product_id)
        if not product:
            raise NotFoundError("Product not found")
        media_rows = list(product.media)
        self.repository.delete(product)
        for media in media_rows:
            self._delete_media_files(media)

    async def upload_media(
        self, product_id: UUID, upload: UploadFile, alt_text: str | None = None
    ) -> ProductResponse:
        product = self.repository.get(product_id)
        if not product:
            raise NotFoundError("Product not found")

        data = await upload.read()
        processed = process_uploaded_image(
            data,
            content_type=upload.content_type,
            filename=upload.filename,
            max_bytes=settings.max_image_upload_bytes,
        )

        media_id = uuid.uuid4()
        upload_id = uuid.uuid4()
        temp_key = temp_original_key(upload_id)
        variant_keys = product_media_variant_keys(product.id, media_id)
        stored_keys: list[str] = []

        try:
            self.storage.save_bytes(
                temp_key,
                data,
                content_type=processed.original.content_type,
            )
            stored_keys.append(temp_key)

            for variant_name, variant in (
                ("large", processed.large),
                ("medium", processed.medium),
                ("thumbnail", processed.thumbnail),
            ):
                key = variant_keys[variant_name]
                self.storage.save_bytes(
                    key,
                    variant.data,
                    content_type=variant.content_type,
                )
                stored_keys.append(key)

            large_url = self.storage.get_url(variant_keys["large"])
            is_primary = len(product.media) == 0
            media = ProductMedia(
                id=media_id,
                product_id=product.id,
                url=large_url,
                alt_text=alt_text.strip() if alt_text else product.name,
                sort_order=len(product.media),
                is_primary=is_primary,
                storage_provider=self.storage.provider_name,
                original_filename=upload.filename,
                original_mime_type=processed.original.content_type,
                original_file_size=processed.original.file_size,
                original_width=processed.original.width,
                original_height=processed.original.height,
                large_storage_key=variant_keys["large"],
                medium_storage_key=variant_keys["medium"],
                thumbnail_storage_key=variant_keys["thumbnail"],
                large_file_size=processed.large.file_size,
                medium_file_size=processed.medium.file_size,
                thumbnail_file_size=processed.thumbnail.file_size,
                width=processed.large.width,
                height=processed.large.height,
            )
            self.repository.add_media(media)
        except Exception:
            self.storage.delete_many(stored_keys)
            raise
        else:
            try:
                self.storage.delete(temp_key)
            except Exception:
                logger.exception("Failed to delete temporary upload %s", temp_key)

        refreshed = self.repository.get(product.id)
        return self._to_response(refreshed or product)

    def delete_media(self, product_id: UUID, media_id: UUID) -> ProductResponse:
        product = self.repository.get(product_id)
        if not product:
            raise NotFoundError("Product not found")
        media = self.repository.get_media(media_id)
        if not media or media.product_id != product_id:
            raise NotFoundError("Product media not found")

        was_primary = media.is_primary
        # Delete storage objects first so a storage failure does not leave DB orphans.
        self._delete_media_files(media, raise_on_error=True)
        self.repository.delete_media(media)

        refreshed = self.repository.get(product_id)
        if refreshed and was_primary and refreshed.media:
            refreshed.media[0].is_primary = True
            refreshed = self.repository.save(refreshed)
        if not refreshed:
            raise NotFoundError("Product not found")
        return self._to_response(refreshed)

    def set_primary_media(self, product_id: UUID, media_id: UUID) -> ProductResponse:
        product = self.repository.get(product_id)
        if not product:
            raise NotFoundError("Product not found")
        target = next((item for item in product.media if item.id == media_id), None)
        if not target:
            raise NotFoundError("Product media not found")
        for item in product.media:
            item.is_primary = item.id == media_id
        saved = self.repository.save(product)
        return self._to_response(saved)

    def reorder_media(self, product_id: UUID, media_ids: list[UUID]) -> ProductResponse:
        product = self.repository.get(product_id)
        if not product:
            raise NotFoundError("Product not found")

        by_id = {item.id: item for item in product.media}
        if set(media_ids) != set(by_id.keys()):
            raise AppError("Media order must include every product image exactly once", 400)

        for index, media_id in enumerate(media_ids):
            by_id[media_id].sort_order = index
            by_id[media_id].is_primary = index == 0

        saved = self.repository.save(product)
        return self._to_response(saved)

    def _sync_attributes(
        self, product: Product, attributes: list[ProductAttributeInput]
    ) -> Product:
        rows = [
            ProductAttribute(
                product_id=product.id,
                name=item.name.strip(),
                values=[value.strip() for value in item.values if value.strip()],
                sort_order=item.sort_order or index,
            )
            for index, item in enumerate(attributes)
            if item.name.strip()
        ]
        return self.repository.replace_attributes(product, rows)

    def _sync_variants(
        self, product: Product, variants: list[ProductVariantInput]
    ) -> Product:
        rows = [
            ProductVariant(
                product_id=product.id,
                sku=item.sku.strip(),
                price=item.price,
                stock=item.stock,
                options={key: str(value) for key, value in item.options.items()},
                is_active=item.is_active,
                sort_order=item.sort_order or index,
            )
            for index, item in enumerate(variants)
            if item.sku.strip()
        ]
        return self.repository.replace_variants(product, rows)

    def _media_to_response(self, media: ProductMedia) -> ProductMediaResponse:
        large_url, medium_url, thumbnail_url = self._resolve_media_urls(media)
        return ProductMediaResponse(
            id=media.id,
            product_id=media.product_id,
            url=large_url,
            large_url=large_url,
            medium_url=medium_url,
            thumbnail_url=thumbnail_url,
            original_filename=getattr(media, "original_filename", None),
            alt_text=media.alt_text,
            sort_order=media.sort_order,
            is_primary=media.is_primary,
            created_at=media.created_at,
            updated_at=getattr(media, "updated_at", None),
        )

    def _resolve_media_urls(self, media: ProductMedia) -> tuple[str, str, str]:
        """Return (large, medium, thumbnail) public URLs with legacy fallback."""
        large_key = getattr(media, "large_storage_key", None)
        medium_key = getattr(media, "medium_storage_key", None)
        thumbnail_key = getattr(media, "thumbnail_storage_key", None)

        if large_key and medium_key and thumbnail_key:
            return (
                self.storage.get_url(large_key),
                self.storage.get_url(medium_key),
                self.storage.get_url(thumbnail_key),
            )

        legacy = media.url
        return legacy, legacy, legacy

    def _to_response(self, product: Product) -> ProductResponse:
        media = [
            self._media_to_response(item)
            for item in sorted(product.media, key=lambda row: (row.sort_order, row.id))
        ]
        primary_item = next((item for item in media if item.is_primary), None)
        if not primary_item and media:
            primary_item = media[0]
        primary = None
        if primary_item:
            primary = primary_item.medium_url or primary_item.url

        category_name = None
        if product.category_id:
            category = self.category_repository.get(product.category_id)
            category_name = category.name if category else None

        attributes = [
            ProductAttributeResponse.model_validate(item)
            for item in sorted(
                product.attributes, key=lambda row: (row.sort_order, row.id)
            )
        ]
        variants = [
            ProductVariantResponse.model_validate(item)
            for item in sorted(
                product.variants, key=lambda row: (row.sort_order, row.id)
            )
        ]

        return ProductResponse(
            id=product.id,
            name=product.name,
            slug=product.slug,
            description=product.description,
            short_description=product.short_description,
            price=product.price,
            compare_at_price=product.compare_at_price,
            discount_percent=product.discount_percent,
            sku=product.sku,
            manufacturer_name=product.manufacturer_name,
            manufacturer_brand=product.manufacturer_brand,
            stock=product.stock,
            tags=product.tags,
            visibility=product.visibility,
            published_at=product.published_at,
            category_id=product.category_id,
            category_name=category_name,
            brand_id=getattr(product, "brand_id", None),
            is_published=product.is_published,
            is_active=product.is_active,
            is_featured=getattr(product, "is_featured", False),
            is_trending=getattr(product, "is_trending", False),
            is_best_seller=getattr(product, "is_best_seller", False),
            seo_title=getattr(product, "seo_title", None),
            seo_description=getattr(product, "seo_description", None),
            exchangeable=product.exchangeable,
            refundable=product.refundable,
            sort_order=product.sort_order,
            primary_image_url=primary,
            media=media,
            attributes=attributes,
            variants=variants,
            created_at=product.created_at,
            updated_at=product.updated_at,
            deleted_at=getattr(product, "deleted_at", None),
        )

    def _ensure_unique_slug(self, slug: str, exclude_id: UUID | None = None) -> None:
        existing = self.repository.get_by_slug(slug)
        if existing and existing.id != exclude_id:
            raise ConflictError("A product with this slug already exists")

    def _ensure_unique_sku(self, sku: str, exclude_id: UUID | None = None) -> None:
        existing = self.repository.get_by_sku(sku)
        if existing and existing.id != exclude_id:
            raise ConflictError("A product with this SKU already exists")

    def _validate_category(self, category_id: UUID | None) -> None:
        if category_id is None:
            return
        if not self.category_repository.get(category_id):
            raise NotFoundError("Category not found")

    def _validate_brand(self, brand_id: UUID | None) -> None:
        if brand_id is None:
            return
        if not self.brand_repository or not self.brand_repository.get(brand_id):
            raise NotFoundError("Brand not found")

    def _validate_prices(
        self, price: Decimal, compare_at_price: Decimal | None
    ) -> None:
        if compare_at_price is not None and compare_at_price < price:
            raise AppError(
                "Compare-at price must be greater than or equal to price", 400
            )

    def _normalize_visibility(self, visibility: str) -> str:
        value = (visibility or "public").strip().lower()
        if value not in ALLOWED_VISIBILITY:
            raise AppError("Visibility must be public, catalog, or hidden", 400)
        return value

    def _validate_attributes(self, attributes: list[ProductAttributeInput]) -> None:
        names = set()
        for item in attributes:
            name = item.name.strip().lower()
            if not name:
                continue
            if name in names:
                raise AppError("Attribute names must be unique", 400)
            names.add(name)
            cleaned = [value.strip() for value in item.values if value.strip()]
            if not cleaned:
                raise AppError(f"Attribute '{item.name}' needs at least one value", 400)

    def _validate_variants(
        self,
        variants: list[ProductVariantInput],
        exclude_product_id: UUID | None = None,
    ) -> None:
        skus: set[str] = set()
        for item in variants:
            sku = item.sku.strip().lower()
            if not sku:
                continue
            if sku in skus:
                raise AppError("Variant SKUs must be unique", 400)
            skus.add(sku)
            existing = self.repository.get_variant_by_sku(item.sku.strip())
            if existing and existing.product_id != exclude_product_id:
                raise ConflictError(f"Variant SKU '{item.sku}' already exists")

    def _clean_text(self, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None

    def _delete_media_files(
        self, media: ProductMedia, *, raise_on_error: bool = False
    ) -> None:
        keys = [
            key
            for key in (
                getattr(media, "large_storage_key", None),
                getattr(media, "medium_storage_key", None),
                getattr(media, "thumbnail_storage_key", None),
            )
            if key
        ]
        if keys:
            try:
                self.storage.delete_many(keys)
            except Exception as exc:
                logger.exception("Failed deleting media variants for %s", media.id)
                if raise_on_error:
                    raise AppError(
                        "Failed to delete media files from storage", 500
                    ) from exc
            return

        image_url = media.url or ""
        if image_url.startswith("/uploads/products/"):
            candidate = UPLOAD_ROOT / image_url.removeprefix("/uploads/")
            path = Path(image_url.lstrip("/"))
            target = candidate if candidate.is_file() else path
            try:
                if target.exists() and target.is_file():
                    target.unlink()
            except OSError as exc:
                logger.exception("Failed deleting legacy media file %s", image_url)
                if raise_on_error:
                    raise AppError(
                        "Failed to delete media files from storage", 500
                    ) from exc
