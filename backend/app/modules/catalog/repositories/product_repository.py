from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.modules.catalog.models.product import (
    Product,
    ProductAttribute,
    ProductMedia,
    ProductVariant,
)


class ProductRepository:
    def __init__(self, db: Session):
        self.db = db

    def _options(self):
        return (
            selectinload(Product.media),
            selectinload(Product.attributes),
            selectinload(Product.variants),
        )

    def list(self) -> list[Product]:
        statement = (
            select(Product)
            .options(*self._options())
            .order_by(Product.sort_order.asc(), Product.name.asc())
        )
        return list(self.db.scalars(statement).unique().all())

    def get(self, product_id: int) -> Product | None:
        statement = (
            select(Product)
            .where(Product.id == product_id)
            .options(*self._options())
        )
        return self.db.scalars(statement).unique().first()

    def get_by_slug(self, slug: str) -> Product | None:
        return self.db.scalar(select(Product).where(Product.slug == slug))

    def get_by_sku(self, sku: str) -> Product | None:
        return self.db.scalar(select(Product).where(Product.sku == sku))

    def get_variant_by_sku(self, sku: str) -> ProductVariant | None:
        return self.db.scalar(select(ProductVariant).where(ProductVariant.sku == sku))

    def create(self, **fields) -> Product:
        product = Product(**fields)
        self.db.add(product)
        self.db.commit()
        self.db.refresh(product)
        return self.get(product.id) or product

    def save(self, product: Product) -> Product:
        self.db.add(product)
        self.db.commit()
        self.db.refresh(product)
        return self.get(product.id) or product

    def delete(self, product: Product) -> None:
        self.db.delete(product)
        self.db.commit()

    def replace_attributes(
        self, product: Product, attributes: list[ProductAttribute]
    ) -> Product:
        product.attributes.clear()
        self.db.flush()
        for item in attributes:
            product.attributes.append(item)
        self.db.commit()
        self._expire_collections(product.id)
        return self.get(product.id) or product

    def replace_variants(
        self, product: Product, variants: list[ProductVariant]
    ) -> Product:
        product.variants.clear()
        self.db.flush()
        for item in variants:
            product.variants.append(item)
        self.db.commit()
        self._expire_collections(product.id)
        return self.get(product.id) or product

    def add_media(self, media: ProductMedia) -> ProductMedia:
        self.db.add(media)
        self.db.commit()
        self.db.refresh(media)
        self._expire_product_media(media.product_id)
        return media

    def get_media(self, media_id: int) -> ProductMedia | None:
        return self.db.get(ProductMedia, media_id)

    def delete_media(self, media: ProductMedia) -> None:
        product_id = media.product_id
        self.db.delete(media)
        self.db.commit()
        self._expire_product_media(product_id)

    def rollback(self) -> None:
        self.db.rollback()

    def _expire_product_media(self, product_id: int) -> None:
        product = self.db.get(Product, product_id)
        if product is not None:
            self.db.expire(product, ["media"])

    def _expire_collections(self, product_id: int) -> None:
        product = self.db.get(Product, product_id)
        if product is not None:
            self.db.expire(product, ["media", "attributes", "variants"])
