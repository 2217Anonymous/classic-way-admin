from __future__ import annotations

from app.modules.catalog.models.product import Product
from app.modules.catalog.repositories.product_repository import ProductRepository
from app.modules.inventory.models import InventoryItem
from app.modules.inventory.repositories import (
    InventoryItemRepository,
    InventorySettingsRepository,
    StockMovementRepository,
)
from app.modules.inventory.schemas import (
    InventoryItemResponse,
    InventorySettingsResponse,
    InventorySettingsUpdate,
    StockAdjustRequest,
)
from app.utils.exceptions import AppError, NotFoundError

DEFAULT_LOW_STOCK_THRESHOLD = 10


class InventorySettingsService:
    def __init__(self, repository: InventorySettingsRepository):
        self.repository = repository

    def get_settings(self) -> InventorySettingsResponse:
        return InventorySettingsResponse.model_validate(self._get_or_create())

    def get_threshold(self) -> int:
        return self._get_or_create().low_stock_threshold

    def update_settings(
        self, payload: InventorySettingsUpdate
    ) -> InventorySettingsResponse:
        row = self.repository.get_singleton()
        if not row:
            row = self.repository.create(
                low_stock_threshold=payload.low_stock_threshold
            )
        else:
            row.low_stock_threshold = payload.low_stock_threshold
            row = self.repository.save(row)
        return InventorySettingsResponse.model_validate(row)

    def _get_or_create(self):
        row = self.repository.get_singleton()
        if not row:
            row = self.repository.create(
                low_stock_threshold=DEFAULT_LOW_STOCK_THRESHOLD
            )
        return row


class InventoryService:
    """VL-013 — stock levels, low-stock alerts, and manual adjustments."""

    def __init__(
        self,
        repository: InventoryItemRepository,
        movement_repository: StockMovementRepository,
        settings_repository: InventorySettingsRepository,
        product_repository: ProductRepository,
    ):
        self.repository = repository
        self.movement_repository = movement_repository
        self.settings_service = InventorySettingsService(settings_repository)
        self.product_repository = product_repository

    def list_items(self) -> list[InventoryItemResponse]:
        self._sync_from_products()
        threshold = self.settings_service.get_threshold()
        return [self._to_response(item, threshold) for item in self.repository.list()]

    def list_alerts(self) -> list[InventoryItemResponse]:
        self._sync_from_products()
        threshold = self.settings_service.get_threshold()
        return [
            self._to_response(item, threshold)
            for item in self.repository.list()
            if (item.quantity - item.reserved) <= threshold
        ]

    def adjust(self, item_id: int, payload: StockAdjustRequest) -> InventoryItemResponse:
        item = self.repository.get(item_id)
        if not item:
            raise NotFoundError("Inventory item not found")

        new_quantity = item.quantity + payload.delta
        if new_quantity < 0:
            raise AppError("Adjustment would result in negative stock", 400)

        item.quantity = new_quantity
        item = self.repository.save(item)
        self.movement_repository.create(
            inventory_item_id=item.id,
            delta=payload.delta,
            reason=payload.reason.strip(),
            reference=payload.reference.strip() if payload.reference else None,
        )

        threshold = self.settings_service.get_threshold()
        return self._to_response(item, threshold)

    def _sync_from_products(self) -> None:
        """Seed inventory_items from catalog products on first read (demo convenience)."""
        if self.repository.count() > 0:
            return
        for product in self.product_repository.list():
            self._sync_product(product)

    def _sync_product(self, product: Product) -> None:
        if product.variants:
            for variant in product.variants:
                if self.repository.get_by_product(product.id, variant.id):
                    continue
                self.repository.create(
                    product_id=product.id,
                    variant_id=variant.id,
                    sku=variant.sku,
                    quantity=variant.stock,
                    reserved=0,
                )
        else:
            if self.repository.get_by_product(product.id, None):
                return
            self.repository.create(
                product_id=product.id,
                variant_id=None,
                sku=product.sku,
                quantity=product.stock,
                reserved=0,
            )

    def _to_response(
        self, item: InventoryItem, threshold: int
    ) -> InventoryItemResponse:
        available = item.quantity - item.reserved
        product_name = None
        if item.product_id:
            product = self.product_repository.get(item.product_id)
            product_name = product.name if product else None
        return InventoryItemResponse(
            id=item.id,
            product_id=item.product_id,
            variant_id=item.variant_id,
            sku=item.sku,
            quantity=item.quantity,
            reserved=item.reserved,
            available=available,
            is_low_stock=available <= threshold,
            product_name=product_name,
            updated_at=item.updated_at,
        )
