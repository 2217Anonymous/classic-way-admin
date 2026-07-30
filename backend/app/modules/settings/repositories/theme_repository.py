from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.settings.models.theme import Theme


class ThemeRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_default(self) -> Theme | None:
        statement = (
            select(Theme)
            .where(Theme.is_default.is_(True), Theme.customer_id.is_(None))
            .order_by(Theme.created_at.asc())
        )
        return self.db.scalar(statement)

    def get_by_customer(self, customer_id: UUID) -> Theme | None:
        return self.db.scalar(select(Theme).where(Theme.customer_id == customer_id))

    def create(self, **fields) -> Theme:
        row = Theme(**fields)
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def save(self, row: Theme) -> Theme:
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row
