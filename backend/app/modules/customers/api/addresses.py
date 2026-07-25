from uuid import UUID
from fastapi import APIRouter, Response, status

from app.modules.customers.api.dependencies import CurrentCustomer, DbSession
from app.modules.orders.repositories.address_repository import AddressRepository
from app.modules.orders.schemas.address import (
    AddressCreate,
    AddressResponse,
    AddressUpdate,
)
from app.utils.exceptions import NotFoundError

router = APIRouter(prefix="/addresses", tags=["Customer Addresses"])


def _repo(db: DbSession) -> AddressRepository:
    return AddressRepository(db)


def _get_owned(db: DbSession, customer_id: UUID, address_id: UUID):
    row = _repo(db).get(address_id)
    if not row or row.customer_id != customer_id:
        raise NotFoundError("Address not found")
    return row


@router.get("", response_model=list[AddressResponse])
def list_addresses(customer: CurrentCustomer, db: DbSession) -> list[AddressResponse]:
    return [
        AddressResponse.model_validate(row)
        for row in _repo(db).list_for_customer(customer.id)
    ]


@router.post("", response_model=AddressResponse, status_code=status.HTTP_201_CREATED)
def create_address(
    payload: AddressCreate, customer: CurrentCustomer, db: DbSession
) -> AddressResponse:
    repo = _repo(db)
    if payload.is_default:
        repo.unset_default_for_customer(customer.id)
    row = repo.create(
        customer_id=customer.id,
        user_id=None,
        full_name=payload.full_name.strip(),
        phone=payload.phone.strip(),
        line1=payload.line1.strip(),
        line2=payload.line2.strip() if payload.line2 else None,
        city=payload.city.strip(),
        state=payload.state.strip(),
        postal_code=payload.postal_code.strip(),
        country=(payload.country or "India").strip(),
        is_default=payload.is_default,
    )
    return AddressResponse.model_validate(row)


@router.get("/{address_id}", response_model=AddressResponse)
def get_address(
    address_id: UUID, customer: CurrentCustomer, db: DbSession
) -> AddressResponse:
    return AddressResponse.model_validate(_get_owned(db, customer.id, address_id))


@router.put("/{address_id}", response_model=AddressResponse)
def update_address(
    address_id: UUID,
    payload: AddressUpdate,
    customer: CurrentCustomer,
    db: DbSession,
) -> AddressResponse:
    repo = _repo(db)
    row = _get_owned(db, customer.id, address_id)
    changes = payload.model_dump(exclude_unset=True)
    if changes.get("is_default"):
        repo.unset_default_for_customer(customer.id)
    for field in (
        "full_name",
        "phone",
        "line1",
        "line2",
        "city",
        "state",
        "postal_code",
        "country",
    ):
        if field in changes:
            value = changes[field]
            setattr(row, field, value.strip() if isinstance(value, str) else value)
    if "is_default" in changes and changes["is_default"] is not None:
        row.is_default = changes["is_default"]
    return AddressResponse.model_validate(repo.save(row))


@router.delete("/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_address(
    address_id: UUID, customer: CurrentCustomer, db: DbSession
) -> Response:
    repo = _repo(db)
    row = _get_owned(db, customer.id, address_id)
    repo.delete(row)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put("/{address_id}/default", response_model=AddressResponse)
def set_default(
    address_id: UUID, customer: CurrentCustomer, db: DbSession
) -> AddressResponse:
    repo = _repo(db)
    row = _get_owned(db, customer.id, address_id)
    repo.unset_default_for_customer(customer.id)
    row.is_default = True
    return AddressResponse.model_validate(repo.save(row))
