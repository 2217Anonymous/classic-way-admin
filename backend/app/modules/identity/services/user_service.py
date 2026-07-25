from app.core.security import hash_password
from app.modules.iam.public import IamService
from app.modules.identity.models.user import User
from app.modules.identity.repositories.user_repository import UserRepository
from app.modules.identity.schemas.user import UserCreate, UserUpdate
from app.utils.exceptions import ConflictError, NotFoundError


class UserService:
    def __init__(self, user_repository: UserRepository, iam: IamService):
        self.users = user_repository
        self.iam = iam

    def list_users(self, skip: int = 0, limit: int = 100) -> list[User]:
        return self.users.list(skip, limit)

    def get_user(self, user_id: int) -> User:
        user = self.users.get(user_id)
        if not user:
            raise NotFoundError("User not found")
        return user

    def create_user(self, payload: UserCreate) -> User:
        email = payload.email.lower()
        if self.users.get_by_email(email):
            raise ConflictError("A user with this email already exists")

        roles = self.iam.resolve_roles(payload.role_ids, default_to_viewer=True)
        return self.users.create(
            email=email,
            full_name=payload.full_name.strip(),
            hashed_password=hash_password(payload.password),
            roles=roles,
        )

    def update_user(self, user_id: int, payload: UserUpdate) -> User:
        user = self.get_user(user_id)
        changes = payload.model_dump(exclude_unset=True)

        if "role_ids" in changes:
            role_ids = changes.pop("role_ids") or []
            user.roles = self.iam.resolve_roles(role_ids)
        if password := changes.pop("password", None):
            user.hashed_password = hash_password(password)
        for field, value in changes.items():
            setattr(user, field, value)
        return self.users.save(user)

    def delete_user(self, user_id: int, current_user_id: int) -> None:
        if user_id == current_user_id:
            raise ConflictError("You cannot delete your own account")
        self.users.delete(self.get_user(user_id))
