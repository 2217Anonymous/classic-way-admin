from app.core.security import create_access_token, verify_password
from app.modules.identity.models.user import User
from app.modules.identity.repositories.user_repository import UserRepository
from app.utils.exceptions import AuthenticationError


class PasswordAuthService:
    def __init__(self, repository: UserRepository):
        self.repository = repository

    def authenticate(self, email: str, password: str) -> tuple[str, User]:
        user = self.repository.get_by_email(email.lower())
        if not user or not verify_password(password, user.hashed_password):
            raise AuthenticationError("Incorrect email or password")
        if not user.is_active:
            raise AuthenticationError("This user account is inactive")
        return create_access_token(str(user.id)), user
