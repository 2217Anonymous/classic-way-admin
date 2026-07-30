from typing import Annotated

from fastapi import APIRouter, Depends

from app.modules.iam.api.dependencies import AdminUser, require_roles
from app.modules.iam.constants import MANAGER_ROLE, VIEWER_ROLE
from app.modules.identity.api.dependencies import DbSession
from app.modules.identity.models.user import User
from app.modules.settings.repositories.store_repository import StoreSettingsRepository
from app.modules.settings.schemas.store import StoreSettingsResponse, StoreSettingsUpdate
from app.modules.settings.services.store_service import StoreSettingsService

router = APIRouter(tags=["Settings"])


def get_store_service(db: DbSession) -> StoreSettingsService:
    return StoreSettingsService(StoreSettingsRepository(db))


@router.get("/store-settings", response_model=StoreSettingsResponse)
def get_store_settings(
    db: DbSession,
    _: Annotated[User, Depends(require_roles(MANAGER_ROLE, VIEWER_ROLE))],
) -> StoreSettingsResponse:
    return get_store_service(db).get_settings()


@router.put("/store-settings", response_model=StoreSettingsResponse)
def update_store_settings(
    payload: StoreSettingsUpdate, db: DbSession, _: AdminUser
) -> StoreSettingsResponse:
    return get_store_service(db).update_settings(payload)
