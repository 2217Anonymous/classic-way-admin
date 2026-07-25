from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.modules.iam.api.dependencies import AdminUser, require_roles
from app.modules.iam.constants import MANAGER_ROLE, VIEWER_ROLE
from app.modules.identity.api.dependencies import DbSession
from app.modules.identity.models.user import User
from app.modules.notifications.repositories import NotificationRepository
from app.modules.notifications.schemas import (
    NotificationResponse,
    NotificationSendRequest,
)
from app.modules.notifications.services import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def get_service(db: DbSession) -> NotificationService:
    return NotificationService(NotificationRepository(db))


@router.get("", response_model=list[NotificationResponse])
def list_notifications(
    db: DbSession,
    _: Annotated[User, Depends(require_roles(MANAGER_ROLE, VIEWER_ROLE))],
) -> list[NotificationResponse]:
    return get_service(db).list_notifications()


@router.post(
    "/send", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED
)
def send_notification(
    payload: NotificationSendRequest, db: DbSession, _: AdminUser
) -> NotificationResponse:
    return get_service(db).send(payload)
