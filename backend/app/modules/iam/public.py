from sqlalchemy.orm import Session

from app.modules.iam.constants import DEFAULT_ROLES, VIEWER_ROLE
from app.modules.iam.models.role import Role
from app.modules.iam.repositories.role_repository import RoleRepository
from app.utils.exceptions import NotFoundError


class IamService:
    """Public IAM facade used by other business modules."""

    def __init__(self, db: Session):
        self.roles = RoleRepository(db)

    def resolve_roles(
        self,
        role_ids: list[int],
        *,
        default_to_viewer: bool = False,
    ) -> list[Role]:
        roles = self.roles.get_many(role_ids)
        if len(roles) != len(set(role_ids)):
            raise NotFoundError("One or more selected roles do not exist")
        if not roles and default_to_viewer:
            viewer = self.roles.get_by_name(VIEWER_ROLE)
            return [viewer] if viewer else []
        return roles

    def get_role_by_name(self, name: str) -> Role | None:
        return self.roles.get_by_name(name)

    def seed_default_roles(self) -> None:
        for name, description in DEFAULT_ROLES:
            if not self.roles.get_by_name(name):
                self.roles.create(name, description)
