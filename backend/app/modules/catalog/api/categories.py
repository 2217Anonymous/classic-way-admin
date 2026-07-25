from typing import Annotated

from fastapi import APIRouter, Depends, File, UploadFile, status

from app.modules.catalog.models.category import Category
from app.modules.catalog.repositories.category_repository import CategoryRepository
from app.modules.catalog.schemas.category import (
    CategoryCreate,
    CategoryDeleteResponse,
    CategoryResponse,
    CategoryTreeNode,
    CategoryUpdate,
)
from app.modules.catalog.services.category_service import CategoryService
from app.modules.iam.api.dependencies import AdminUser, require_roles
from app.modules.iam.constants import MANAGER_ROLE, VIEWER_ROLE
from app.modules.identity.api.dependencies import DbSession
from app.modules.identity.models.user import User

router = APIRouter(prefix="/categories", tags=["Categories"])


def get_service(db: DbSession) -> CategoryService:
    return CategoryService(CategoryRepository(db))


@router.get("", response_model=list[CategoryResponse])
def list_categories(
    db: DbSession,
    _: Annotated[User, Depends(require_roles(MANAGER_ROLE, VIEWER_ROLE))],
) -> list[Category]:
    return get_service(db).list_categories()


@router.get("/tree", response_model=list[CategoryTreeNode])
def list_category_tree(
    db: DbSession,
    _: Annotated[User, Depends(require_roles(MANAGER_ROLE, VIEWER_ROLE))],
) -> list[CategoryTreeNode]:
    return get_service(db).list_tree()


@router.get("/{category_id}", response_model=CategoryResponse)
def get_category(
    category_id: int,
    db: DbSession,
    _: Annotated[User, Depends(require_roles(MANAGER_ROLE, VIEWER_ROLE))],
) -> Category:
    return get_service(db).get_category(category_id)


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: CategoryCreate, db: DbSession, _: AdminUser
) -> Category:
    return get_service(db).create_category(payload)


@router.patch("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int, payload: CategoryUpdate, db: DbSession, _: AdminUser
) -> Category:
    return get_service(db).update_category(category_id, payload)


@router.post("/{category_id}/image", response_model=CategoryResponse)
async def upload_category_image(
    category_id: int,
    db: DbSession,
    _: AdminUser,
    file: UploadFile = File(...),
) -> Category:
    return await get_service(db).upload_image(category_id, file)


@router.delete("/{category_id}", response_model=CategoryDeleteResponse)
def delete_category(
    category_id: int, db: DbSession, _: AdminUser
) -> CategoryDeleteResponse:
    deleted_ids = get_service(db).delete_category(category_id)
    return CategoryDeleteResponse(deleted_ids=deleted_ids)
