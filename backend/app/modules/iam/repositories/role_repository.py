from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.iam.models.role import Role


class RoleRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self) -> list[Role]:
        return list(self.db.scalars(select(Role).order_by(Role.name)).all())

    def get(self, role_id: int) -> Role | None:
        return self.db.get(Role, role_id)

    def get_by_name(self, name: str) -> Role | None:
        return self.db.scalar(select(Role).where(Role.name == name))

    def get_many(self, role_ids: list[int]) -> list[Role]:
        if not role_ids:
            return []
        return list(self.db.scalars(select(Role).where(Role.id.in_(set(role_ids)))).all())

    def create(self, name: str, description: str | None) -> Role:
        role = Role(name=name, description=description)
        self.db.add(role)
        self.db.commit()
        self.db.refresh(role)
        return role

    def update(self, role: Role, changes: dict[str, str | None]) -> Role:
        for field, value in changes.items():
            setattr(role, field, value)
        self.db.commit()
        self.db.refresh(role)
        return role

    def delete(self, role: Role) -> None:
        self.db.delete(role)
        self.db.commit()
