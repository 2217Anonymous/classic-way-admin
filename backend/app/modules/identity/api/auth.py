from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm

from app.modules.identity.api.dependencies import CurrentUser, DbSession
from app.modules.identity.models.user import User
from app.modules.identity.repositories.user_repository import UserRepository
from app.modules.identity.schemas.auth import TokenResponse
from app.modules.identity.schemas.user import UserResponse
from app.modules.identity.services.password_auth import PasswordAuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: DbSession,
) -> TokenResponse:
    token, user = PasswordAuthService(UserRepository(db)).authenticate(
        form.username, form.password
    )
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.get("/me", response_model=UserResponse)
def me(current_user: CurrentUser) -> User:
    return current_user
