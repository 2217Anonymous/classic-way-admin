from app.modules.iam.constants import DEFAULT_ROLES
from app.modules.iam.models.role import Role
from app.modules.iam.repositories.role_repository import RoleRepository
from app.modules.iam.schemas.role import RoleCreate, RoleUpdate
from app.utils.exceptions import ConflictError, NotFoundError


class RoleService:
    def __init__(self, repository: RoleRepository):
        self.repository = repository

    def list_roles(self) -> list[Role]:
        return self.repository.list()

    def create_role(self, payload: RoleCreate) -> Role:
        name = payload.name.lower()
        if self.repository.get_by_name(name):
            raise ConflictError("A role with this name already exists")
        return self.repository.create(name, payload.description)

    def update_role(self, role_id: int, payload: RoleUpdate) -> Role:
        role = self.repository.get(role_id)
        if not role:
            raise NotFoundError("Role not found")
        changes = payload.model_dump(exclude_unset=True)
        if "name" in changes:
            name = changes["name"].lower()
            protected_names = {default_name for default_name, _ in DEFAULT_ROLES}
            if role.name in protected_names and name != role.name:
                raise ConflictError("Default role names cannot be changed")
            existing = self.repository.get_by_name(name)
            if existing and existing.id != role.id:
                raise ConflictError("A role with this name already exists")
            changes["name"] = name
        return self.repository.update(role, changes)

    def delete_role(self, role_id: int) -> None:
        role = self.repository.get(role_id)
        if not role:
            raise NotFoundError("Role not found")
        protected_names = {name for name, _ in DEFAULT_ROLES}
        if role.name in protected_names:
            raise ConflictError("Default roles cannot be deleted")
        if role.users:
            raise ConflictError("Remove this role from all users before deleting it")
        self.repository.delete(role)
