from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.catalog.models.brand import Brand
from app.modules.catalog.models.product import Product


class BrandRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self) -> list[Brand]:
        statement = select(Brand).order_by(Brand.name.asc())
        return list(self.db.scalars(statement).all())

    def get(self, brand_id: int) -> Brand | None:
        return self.db.get(Brand, brand_id)

    def get_by_slug(self, slug: str) -> Brand | None:
        return self.db.scalar(select(Brand).where(Brand.slug == slug))

    def count_products(self, brand_id: int) -> int:
        return int(
            self.db.scalar(
                select(func.count(Product.id)).where(Product.brand_id == brand_id)
            )
            or 0
        )

    def create(self, **fields) -> Brand:
        brand = Brand(**fields)
        self.db.add(brand)
        self.db.commit()
        self.db.refresh(brand)
        return brand

    def save(self, brand: Brand) -> Brand:
        self.db.add(brand)
        self.db.commit()
        self.db.refresh(brand)
        return brand

    def delete(self, brand: Brand) -> None:
        self.db.delete(brand)
        self.db.commit()

    def rollback(self) -> None:
        self.db.rollback()
