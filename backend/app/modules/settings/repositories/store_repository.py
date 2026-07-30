from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.settings.models.store import StoreSettings


class StoreSettingsRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_singleton(self) -> StoreSettings | None:
        return self.db.scalar(select(StoreSettings).order_by(StoreSettings.id.asc()))

    def create(self, **fields) -> StoreSettings:
        row = StoreSettings(**fields)
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def save(self, row: StoreSettings) -> StoreSettings:
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row
