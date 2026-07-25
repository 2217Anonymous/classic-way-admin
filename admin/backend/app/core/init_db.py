from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.modules.iam.constants import ADMIN_ROLE
from app.modules.iam.public import IamService
from app.modules.identity.repositories.user_repository import UserRepository


def seed_database(db: Session) -> None:
    iam = IamService(db)
    iam.seed_default_roles()

    user_repository = UserRepository(db)
    if not user_repository.get_by_email(str(settings.initial_admin_email).lower()):
        admin_role = iam.get_role_by_name(ADMIN_ROLE)
        user_repository.create(
            email=str(settings.initial_admin_email).lower(),
            full_name=settings.initial_admin_name,
            hashed_password=hash_password(settings.initial_admin_password),
            roles=[admin_role] if admin_role else [],
        )
