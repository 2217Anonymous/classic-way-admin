from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.modules.catalog.repositories.attribute_repository import AttributeRepository
from app.modules.catalog.schemas.attribute import (
    AttributeDefinitionCreate,
    AttributeDefinitionResponse,
    AttributeDefinitionUpdate,
)
from app.modules.catalog.services.attribute_service import AttributeService
from app.modules.iam.api.dependencies import AdminUser, require_roles
from app.modules.iam.constants import MANAGER_ROLE, VIEWER_ROLE
from app.modules.identity.api.dependencies import DbSession
from app.modules.identity.models.user import User

router = APIRouter(prefix="/attributes", tags=["Attributes"])


def get_service(db: DbSession) -> AttributeService:
    return AttributeService(AttributeRepository(db))


@router.get("", response_model=list[AttributeDefinitionResponse])
def list_attributes(
    db: DbSession,
    _: Annotated[User, Depends(require_roles(MANAGER_ROLE, VIEWER_ROLE))],
) -> list[AttributeDefinitionResponse]:
    return get_service(db).list_attributes()


@router.get("/{attribute_id}", response_model=AttributeDefinitionResponse)
def get_attribute(
    attribute_id: int,
    db: DbSession,
    _: Annotated[User, Depends(require_roles(MANAGER_ROLE, VIEWER_ROLE))],
) -> AttributeDefinitionResponse:
    return get_service(db).get_attribute(attribute_id)


@router.post(
    "", response_model=AttributeDefinitionResponse, status_code=status.HTTP_201_CREATED
)
def create_attribute(
    payload: AttributeDefinitionCreate, db: DbSession, _: AdminUser
) -> AttributeDefinitionResponse:
    return get_service(db).create_attribute(payload)


@router.patch("/{attribute_id}", response_model=AttributeDefinitionResponse)
def update_attribute(
    attribute_id: int,
    payload: AttributeDefinitionUpdate,
    db: DbSession,
    _: AdminUser,
) -> AttributeDefinitionResponse:
    return get_service(db).update_attribute(attribute_id, payload)


@router.delete("/{attribute_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attribute(attribute_id: int, db: DbSession, _: AdminUser) -> None:
    get_service(db).delete_attribute(attribute_id)
