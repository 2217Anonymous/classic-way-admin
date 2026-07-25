from typing import Annotated

from fastapi import APIRouter, Depends

from app.modules.catalog.repositories.product_repository import ProductRepository
from app.modules.iam.api.dependencies import AdminUser, require_roles
from app.modules.iam.constants import MANAGER_ROLE, VIEWER_ROLE
from app.modules.identity.api.dependencies import DbSession
from app.modules.identity.models.user import User
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
from app.modules.inventory.services import InventoryService, InventorySettingsService

router = APIRouter(prefix="/inventory", tags=["Inventory"])


def get_service(db: DbSession) -> InventoryService:
    return InventoryService(
        InventoryItemRepository(db),
        StockMovementRepository(db),
        InventorySettingsRepository(db),
        ProductRepository(db),
    )


def get_settings_service(db: DbSession) -> InventorySettingsService:
    return InventorySettingsService(InventorySettingsRepository(db))


@router.get("/items", response_model=list[InventoryItemResponse])
def list_items(
    db: DbSession,
    _: Annotated[User, Depends(require_roles(MANAGER_ROLE, VIEWER_ROLE))],
) -> list[InventoryItemResponse]:
    return get_service(db).list_items()


@router.get("/alerts", response_model=list[InventoryItemResponse])
def list_alerts(
    db: DbSession,
    _: Annotated[User, Depends(require_roles(MANAGER_ROLE, VIEWER_ROLE))],
) -> list[InventoryItemResponse]:
    return get_service(db).list_alerts()


@router.get("/settings", response_model=InventorySettingsResponse)
def get_settings(
    db: DbSession,
    _: Annotated[User, Depends(require_roles(MANAGER_ROLE, VIEWER_ROLE))],
) -> InventorySettingsResponse:
    return get_settings_service(db).get_settings()


@router.put("/settings", response_model=InventorySettingsResponse)
def update_settings(
    payload: InventorySettingsUpdate, db: DbSession, _: AdminUser
) -> InventorySettingsResponse:
    return get_settings_service(db).update_settings(payload)


@router.post("/items/{item_id}/adjust", response_model=InventoryItemResponse)
def adjust_item(
    item_id: int, payload: StockAdjustRequest, db: DbSession, _: AdminUser
) -> InventoryItemResponse:
    return get_service(db).adjust(item_id, payload)
