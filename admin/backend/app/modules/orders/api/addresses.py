from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.modules.iam.api.dependencies import AdminUser, require_roles
from app.modules.iam.constants import MANAGER_ROLE, VIEWER_ROLE
from app.modules.identity.api.dependencies import DbSession
from app.modules.identity.models.user import User
from app.modules.orders.repositories.address_repository import AddressRepository
from app.modules.orders.schemas.address import (
    AddressCreate,
    AddressResponse,
    AddressUpdate,
)
from app.modules.orders.services.address_service import AddressService

router = APIRouter(prefix="/addresses", tags=["Addresses"])


def get_service(db: DbSession) -> AddressService:
    return AddressService(AddressRepository(db))


@router.get("", response_model=list[AddressResponse])
def list_addresses(
    db: DbSession,
    _: Annotated[User, Depends(require_roles(MANAGER_ROLE, VIEWER_ROLE))],
    user_id: int | None = None,
) -> list[AddressResponse]:
    return get_service(db).list_addresses(user_id)


@router.post("", response_model=AddressResponse, status_code=status.HTTP_201_CREATED)
def create_address(payload: AddressCreate, db: DbSession, _: AdminUser) -> AddressResponse:
    return get_service(db).create_address(payload)


@router.get("/{address_id}", response_model=AddressResponse)
def get_address(
    address_id: int,
    db: DbSession,
    _: Annotated[User, Depends(require_roles(MANAGER_ROLE, VIEWER_ROLE))],
) -> AddressResponse:
    return get_service(db).get_address(address_id)


@router.patch("/{address_id}", response_model=AddressResponse)
def update_address(
    address_id: int, payload: AddressUpdate, db: DbSession, _: AdminUser
) -> AddressResponse:
    return get_service(db).update_address(address_id, payload)


@router.delete("/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_address(address_id: int, db: DbSession, _: AdminUser) -> None:
    get_service(db).delete_address(address_id)
