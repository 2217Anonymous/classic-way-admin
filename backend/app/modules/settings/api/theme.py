from typing import Annotated

from fastapi import APIRouter, Depends

from app.modules.iam.api.dependencies import AdminUser, require_roles
from app.modules.iam.constants import MANAGER_ROLE, VIEWER_ROLE
from app.modules.identity.api.dependencies import DbSession
from app.modules.identity.models.user import User
from app.modules.settings.repositories.theme_repository import ThemeRepository
from app.modules.settings.schemas.theme import ThemeResponse, ThemeUpdate
from app.modules.settings.services.theme_service import ThemeService

router = APIRouter(tags=["Settings"])


def get_theme_service(db: DbSession) -> ThemeService:
    return ThemeService(ThemeRepository(db))


@router.get("/theme/default", response_model=ThemeResponse)
def get_default_theme(
    db: DbSession,
    _: Annotated[User, Depends(require_roles(MANAGER_ROLE, VIEWER_ROLE))],
) -> ThemeResponse:
    return get_theme_service(db).get_default_theme()


@router.put("/theme/default", response_model=ThemeResponse)
def update_default_theme(
    payload: ThemeUpdate, db: DbSession, _: AdminUser
) -> ThemeResponse:
    return get_theme_service(db).update_default_theme(payload)
