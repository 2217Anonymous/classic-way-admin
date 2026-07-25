from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Response, status

from app.modules.catalog.models.brand import Brand
from app.modules.catalog.repositories.brand_repository import BrandRepository
from app.modules.catalog.schemas.brand import BrandCreate, BrandResponse, BrandUpdate
from app.modules.catalog.services.brand_service import BrandService
from app.modules.iam.api.dependencies import AdminUser, require_roles
from app.modules.iam.constants import MANAGER_ROLE, VIEWER_ROLE
from app.modules.identity.api.dependencies import DbSession
from app.modules.identity.models.user import User

router = APIRouter(prefix="/brands", tags=["Brands"])


def get_service(db: DbSession) -> BrandService:
    return BrandService(BrandRepository(db))


@router.get("", response_model=list[BrandResponse])
def list_brands(
    db: DbSession,
    _: Annotated[User, Depends(require_roles(MANAGER_ROLE, VIEWER_ROLE))],
) -> list[Brand]:
    return get_service(db).list_brands()


@router.get("/{brand_id}", response_model=BrandResponse)
def get_brand(
    brand_id: UUID,
    db: DbSession,
    _: Annotated[User, Depends(require_roles(MANAGER_ROLE, VIEWER_ROLE))],
) -> Brand:
    return get_service(db).get_brand(brand_id)


@router.post("", response_model=BrandResponse, status_code=status.HTTP_201_CREATED)
def create_brand(payload: BrandCreate, db: DbSession, _: AdminUser) -> Brand:
    return get_service(db).create_brand(payload)


@router.patch("/{brand_id}", response_model=BrandResponse)
def update_brand(
    brand_id: UUID, payload: BrandUpdate, db: DbSession, _: AdminUser
) -> Brand:
    return get_service(db).update_brand(brand_id, payload)


@router.delete("/{brand_id}", response_model=BrandResponse | None)
def delete_brand(
    brand_id: UUID, db: DbSession, _: AdminUser, response: Response
) -> Brand | None:
    result = get_service(db).delete_brand(brand_id)
    if result is None:
        response.status_code = status.HTTP_204_NO_CONTENT
    return result
