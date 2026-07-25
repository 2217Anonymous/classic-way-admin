from collections.abc import Callable
from typing import Annotated

from fastapi import Depends

from app.modules.iam.constants import ADMIN_ROLE
from app.modules.identity.api.dependencies import CurrentUser
from app.modules.identity.models.user import User
from app.utils.exceptions import AuthorizationError


def require_roles(*allowed_roles: str) -> Callable[[CurrentUser], User]:
    def dependency(current_user: CurrentUser) -> User:
        user_roles = {role.name for role in current_user.roles}
        if ADMIN_ROLE not in user_roles and user_roles.isdisjoint(allowed_roles):
            raise AuthorizationError()
        return current_user

    return dependency


AdminUser = Annotated[User, Depends(require_roles(ADMIN_ROLE))]
