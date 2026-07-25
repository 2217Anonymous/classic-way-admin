from typing import Annotated

import jwt
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_access_token
from app.modules.identity.models.user import User
from app.modules.identity.repositories.user_repository import UserRepository
from app.utils.exceptions import AuthenticationError

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.api_v1_prefix}/auth/login")
DbSession = Annotated[Session, Depends(get_db)]


def get_current_user(
    db: DbSession,
    token: Annotated[str, Depends(oauth2_scheme)],
) -> User:
    try:
        payload = decode_access_token(token)
        user_id = int(payload.get("sub", ""))
        if payload.get("type") != "access":
            raise ValueError
    except (jwt.PyJWTError, TypeError, ValueError):
        raise AuthenticationError() from None

    user = UserRepository(db).get(user_id)
    if not user or not user.is_active:
        raise AuthenticationError()
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
