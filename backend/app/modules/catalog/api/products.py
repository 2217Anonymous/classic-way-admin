from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, UploadFile, status

from app.modules.catalog.repositories.brand_repository import BrandRepository
from app.modules.catalog.repositories.category_repository import CategoryRepository
from app.modules.catalog.repositories.product_repository import ProductRepository
from app.modules.catalog.schemas.product import (
    ProductCreate,
    ProductMediaOrderUpdate,
    ProductResponse,
    ProductUpdate,
)
from app.modules.catalog.services.product_service import ProductService
from app.modules.iam.api.dependencies import AdminUser, require_roles
from app.modules.iam.constants import MANAGER_ROLE, VIEWER_ROLE
from app.modules.identity.api.dependencies import DbSession
from app.modules.identity.models.user import User

router = APIRouter(prefix="/products", tags=["Products"])


def get_service(db: DbSession) -> ProductService:
    return ProductService(
        ProductRepository(db),
        CategoryRepository(db),
        BrandRepository(db),
    )


@router.get("", response_model=list[ProductResponse])
def list_products(
    db: DbSession,
    _: Annotated[User, Depends(require_roles(MANAGER_ROLE, VIEWER_ROLE))],
) -> list[ProductResponse]:
    return get_service(db).list_products()


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: UUID,
    db: DbSession,
    _: Annotated[User, Depends(require_roles(MANAGER_ROLE, VIEWER_ROLE))],
) -> ProductResponse:
    return get_service(db).get_product(product_id)


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate, db: DbSession, _: AdminUser
) -> ProductResponse:
    return get_service(db).create_product(payload)


@router.patch("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: UUID, payload: ProductUpdate, db: DbSession, _: AdminUser
) -> ProductResponse:
    return get_service(db).update_product(product_id, payload)


@router.post("/{product_id}/media", response_model=ProductResponse)
async def upload_product_media(
    product_id: UUID,
    db: DbSession,
    _: AdminUser,
    file: UploadFile = File(...),
    alt_text: str | None = Form(default=None),
) -> ProductResponse:
    return await get_service(db).upload_media(product_id, file, alt_text)


@router.delete("/{product_id}/media/{media_id}", response_model=ProductResponse)
def delete_product_media(
    product_id: UUID, media_id: UUID, db: DbSession, _: AdminUser
) -> ProductResponse:
    return get_service(db).delete_media(product_id, media_id)


@router.post(
    "/{product_id}/media/{media_id}/primary", response_model=ProductResponse
)
def set_primary_product_media(
    product_id: UUID, media_id: UUID, db: DbSession, _: AdminUser
) -> ProductResponse:
    return get_service(db).set_primary_media(product_id, media_id)


@router.put("/{product_id}/media/order", response_model=ProductResponse)
def reorder_product_media(
    product_id: UUID,
    payload: ProductMediaOrderUpdate,
    db: DbSession,
    _: AdminUser,
) -> ProductResponse:
    return get_service(db).reorder_media(product_id, payload.media_ids)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: UUID, db: DbSession, _: AdminUser) -> None:
    get_service(db).delete_product(product_id)
