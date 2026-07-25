from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status

from app.modules.iam.api.dependencies import AdminUser, require_roles
from app.modules.iam.constants import MANAGER_ROLE, VIEWER_ROLE
from app.modules.iam.public import IamService
from app.modules.identity.api.dependencies import CurrentUser, DbSession
from app.modules.identity.models.user import User
from app.modules.identity.repositories.user_repository import UserRepository
from app.modules.identity.schemas.user import UserCreate, UserResponse, UserUpdate
from app.modules.identity.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["Users"])


def get_service(db: DbSession) -> UserService:
    return UserService(UserRepository(db), IamService(db))


@router.get("", response_model=list[UserResponse])
def list_users(
    db: DbSession,
    _: Annotated[User, Depends(require_roles(MANAGER_ROLE, VIEWER_ROLE))],
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=200),
) -> list[User]:
    return get_service(db).list_users(skip, limit)


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: DbSession,
    _: Annotated[User, Depends(require_roles(MANAGER_ROLE, VIEWER_ROLE))],
) -> User:
    return get_service(db).get_user(user_id)


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, db: DbSession, _: AdminUser) -> User:
    return get_service(db).create_user(payload)


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int, payload: UserUpdate, db: DbSession, _: AdminUser
) -> User:
    return get_service(db).update_user(user_id, payload)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int, db: DbSession, current_user: CurrentUser, _: AdminUser
) -> Response:
    get_service(db).delete_user(user_id, current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
