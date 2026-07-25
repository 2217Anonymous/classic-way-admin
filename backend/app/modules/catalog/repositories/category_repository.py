from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.catalog.models.category import Category


class CategoryRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self) -> list[Category]:
        statement = select(Category).order_by(
            Category.sort_order.asc(), Category.name.asc()
        )
        return list(self.db.scalars(statement).all())

    def list_children(self, parent_id: int) -> list[Category]:
        statement = (
            select(Category)
            .where(Category.parent_id == parent_id)
            .order_by(Category.sort_order.asc(), Category.name.asc())
        )
        return list(self.db.scalars(statement).all())

    def get(self, category_id: int) -> Category | None:
        return self.db.get(Category, category_id)

    def get_by_slug(self, slug: str) -> Category | None:
        return self.db.scalar(select(Category).where(Category.slug == slug))

    def create(self, **fields) -> Category:
        category = Category(**fields)
        self.db.add(category)
        self.db.commit()
        self.db.refresh(category)
        return category

    def save(self, category: Category) -> Category:
        self.db.add(category)
        self.db.commit()
        self.db.refresh(category)
        return category

    def delete(self, category: Category) -> None:
        self.db.delete(category)
        self.db.commit()

    def delete_ids(self, category_ids: list[int]) -> None:
        for category_id in category_ids:
            category = self.get(category_id)
            if category:
                self.db.delete(category)
        self.db.commit()

    def rollback(self) -> None:
        self.db.rollback()

    def has_children(self, category_id: int) -> bool:
        child = self.db.scalar(
            select(Category.id).where(Category.parent_id == category_id).limit(1)
        )
        return child is not None
