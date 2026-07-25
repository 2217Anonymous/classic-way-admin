from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.modules.identity.models.user import User

if TYPE_CHECKING:
    from app.modules.iam.models.role import Role


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self, skip: int = 0, limit: int = 100) -> list[User]:
        statement = (
            select(User)
            .options(selectinload(User.roles))
            .order_by(User.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.scalars(statement).all())

    def count(self) -> int:
        return self.db.scalar(select(func.count()).select_from(User)) or 0

    def get(self, user_id: int) -> User | None:
        return self.db.scalar(
            select(User).options(selectinload(User.roles)).where(User.id == user_id)
        )

    def get_by_email(self, email: str) -> User | None:
        return self.db.scalar(
            select(User).options(selectinload(User.roles)).where(User.email == email)
        )

    def create(
        self,
        *,
        email: str,
        full_name: str,
        hashed_password: str,
        roles: list[Role],
    ) -> User:
        user = User(
            email=email,
            full_name=full_name,
            hashed_password=hashed_password,
            roles=roles,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return self.get(user.id) or user

    def save(self, user: User) -> User:
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return self.get(user.id) or user

    def delete(self, user: User) -> None:
        self.db.delete(user)
        self.db.commit()
