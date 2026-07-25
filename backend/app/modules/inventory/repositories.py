from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.inventory.models import InventoryItem, InventorySettings, StockMovement


class InventorySettingsRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_singleton(self) -> InventorySettings | None:
        return self.db.scalar(
            select(InventorySettings).order_by(InventorySettings.id.asc())
        )

    def create(self, **fields) -> InventorySettings:
        row = InventorySettings(**fields)
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def save(self, row: InventorySettings) -> InventorySettings:
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row


class InventoryItemRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self) -> list[InventoryItem]:
        statement = select(InventoryItem).order_by(InventoryItem.id.asc())
        return list(self.db.scalars(statement).all())

    def get(self, item_id: int) -> InventoryItem | None:
        return self.db.get(InventoryItem, item_id)

    def get_by_product(
        self, product_id: int | None, variant_id: int | None
    ) -> InventoryItem | None:
        statement = select(InventoryItem).where(
            InventoryItem.product_id == product_id,
            InventoryItem.variant_id == variant_id,
        )
        return self.db.scalar(statement)

    def get_by_sku(self, sku: str) -> InventoryItem | None:
        return self.db.scalar(select(InventoryItem).where(InventoryItem.sku == sku))

    def create(self, **fields) -> InventoryItem:
        row = InventoryItem(**fields)
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def save(self, row: InventoryItem) -> InventoryItem:
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def count(self) -> int:
        return self.db.scalar(select(func.count(InventoryItem.id))) or 0


class StockMovementRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, **fields) -> StockMovement:
        row = StockMovement(**fields)
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def list_for_item(self, inventory_item_id: int) -> list[StockMovement]:
        statement = (
            select(StockMovement)
            .where(StockMovement.inventory_item_id == inventory_item_id)
            .order_by(StockMovement.created_at.desc())
        )
        return list(self.db.scalars(statement).all())
